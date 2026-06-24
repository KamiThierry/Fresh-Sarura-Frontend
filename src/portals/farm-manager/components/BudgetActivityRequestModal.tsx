import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActivityLineItem, BudgetRequest } from '../../shared/types/activity';
import DateInput from '../../shared/component/DateInput';

interface BudgetActivityRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    cycleId: number;
    cycleName: string;
    cycleStartDate?: string;
    cycleEndDate?: string;
    budget_categories?: Array<{ name: string, allocated: number }>;
    existingRequests?: BudgetRequest[];
    cycleCreatedAt?: string;
    submittedBy?: string;
    /** Called with the finalised BudgetRequest on submission */
    onSubmit: (request: BudgetRequest) => void;
}

const emptyLine = (): ActivityLineItem => ({
    id: Date.now() + Math.random(),
    activityName: '',
    category: '',
    estimatedCostRwf: 0,
});

const BudgetActivityRequestModal = ({
    isOpen,
    onClose,
    cycleId,
    cycleName,
    cycleStartDate,
    cycleEndDate,
    budget_categories = [],
    existingRequests = [],
    cycleCreatedAt,
    submittedBy = 'Farm Manager',
    onSubmit,
}: BudgetActivityRequestModalProps) => {
    const [lineItems, setLineItems] = useState<ActivityLineItem[]>([emptyLine()]);
    const [globalStartDate, setGlobalStartDate] = useState('');
    const [globalEndDate, setGlobalEndDate] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Normalize to YYYY-MM-DD for reliable string comparison (respects UTC to avoid timezone shifts)
    const normDate = (d?: string) => {
        if (!d) return undefined;
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return undefined;
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const cycleStart = normDate(cycleStartDate);
    const cycleEnd   = normDate(cycleEndDate);
    const cycleCreated = normDate(cycleCreatedAt);

    if (!isOpen) return null;

    const totalRwf = lineItems.reduce((sum, l) => sum + (l.estimatedCostRwf || 0), 0);

    const updateLine = (id: number, field: keyof ActivityLineItem, value: string | number) => {
        setLineItems(prev =>
            prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
        );
    };

    const addLine = () => setLineItems(prev => [...prev, emptyLine()]);

    const removeLine = (id: number) => {
        if (lineItems.length === 1) return; // keep at least one row
        setLineItems(prev => prev.filter(l => l.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const request: BudgetRequest = {
            id: Date.now(),
            cycleId,
            cycleName,
            submittedBy,
            submittedAt: new Date().toISOString(),
            startDate: globalStartDate,
            endDate: globalEndDate,
            lineItems,
            totalRequestedRwf: totalRwf,
            approvalStatus: 'Pending',
        };

        try {
            await onSubmit(request);
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setLineItems([emptyLine()]);
                onClose();
            }, 1800);
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit request.');
        }
    };

    const isWithinBounds = (dateStr: string) => {
        if (!dateStr) return true;
        // Absolute floor is the creation date
        if (cycleCreated && dateStr < cycleCreated) return false;
        // Operational window: planting to harvest
        if (cycleStart && dateStr < cycleStart) return false;
        if (cycleEnd   && dateStr > cycleEnd)   return false;
        return true;
    };

    const isRangeViolation = globalStartDate && globalEndDate && globalEndDate < globalStartDate;
    const isDateViolation = (globalStartDate && !isWithinBounds(globalStartDate)) || (globalEndDate && !isWithinBounds(globalEndDate)) || isRangeViolation;

    const getCategoryUsage = (category: string) => {
        // Sum from existing approved/pending requests
        const existingSum = existingRequests
            .filter(r => r.approvalStatus === 'Approved' || r.approvalStatus === 'Pending')
            .flatMap(r => r.lineItems)
            .filter(item => item.category === category)
            .reduce((sum, item) => sum + (item.estimatedCostRwf || 0), 0);
            
        // Sum from current modal's line items
        const currentModalSum = lineItems
            .filter(item => item.category === category)
            .reduce((sum, item) => sum + (item.estimatedCostRwf || 0), 0);
            
        return existingSum + currentModalSum;
    };

    const getCategoryRemaining = (category: string) => {
        if (!category) return 0;
        const config = budget_categories.find(c => c.name === category);
        const limit = config ? config.allocated : 0;
        
        // available BEFORE this modal's input
        const existingSum = existingRequests
            .filter(r => r.approvalStatus === 'Approved' || r.approvalStatus === 'Pending')
            .flatMap(r => r.lineItems)
            .filter(item => item.category === category)
            .reduce((sum, item) => sum + (item.estimatedCostRwf || 0), 0);

        return Math.max(0, limit - existingSum);
    };

    const budgetViolations = lineItems.map(item => {
        if (!item.category) return false;
        const usage = getCategoryUsage(item.category);
        const config = budget_categories.find(c => c.name === item.category);
        const limit = config ? config.allocated : 0;
        return usage > limit;
    });

    const isOverBudget = budgetViolations.some(v => v);

    // Total requested exceeds entire cycle allocation
    const totalCycleAllocation = budget_categories.reduce((s, c) => s + c.allocated, 0);
    const exceedsCycleTotal = totalRwf > totalCycleAllocation;

    // Any activity has cost of 0
    const hasZeroCostActivity = lineItems.some(l => l.estimatedCostRwf <= 0);

    // Duplicate activity names within this request
    const activityNames = lineItems.map(l => l.activityName.trim().toLowerCase()).filter(Boolean);
    const hasDuplicateActivities = activityNames.length !== new Set(activityNames).size;

    // Single activity exceeds its own category's full budget (not just remaining)
    const hasSingleItemOverCategory = lineItems.some(item => {
        if (!item.category) return false;
        const config = budget_categories.find(c => c.name === item.category);
        return config ? item.estimatedCostRwf > config.allocated : false;
    });

    // Request period longer than cycle duration
    const periodTooLong = (() => {
        if (!globalStartDate || !globalEndDate || !cycleStart || !cycleEnd) return false;
        const reqDays   = (new Date(globalEndDate).getTime()  - new Date(globalStartDate).getTime()) / 86400000;
        const cycleDays = (new Date(cycleEnd).getTime() - new Date(cycleStart).getTime()) / 86400000;
        return reqDays > cycleDays;
    })();

    const isValid =
        globalStartDate &&
        globalEndDate &&
        !isDateViolation &&
        !isOverBudget &&
        !hasZeroCostActivity &&
        !hasDuplicateActivities &&
        !hasSingleItemOverCategory &&
        !periodTooLong &&
        totalRwf > 0 &&
        lineItems.every(
            l => l.activityName.trim() && l.category && l.estimatedCostRwf > 0
        );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                            <ClipboardList size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Budget & Activity Request</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                For <span className="font-semibold text-gray-700 dark:text-gray-300">{cycleName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Success state */}
                {submitted ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">Request Submitted!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting Production Manager approval.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        {/* Global Period Section */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Request Period</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Start Date
                                    </label>
                                    <DateInput
                                        name="start_date"
                                        value={globalStartDate}
                                        onChange={(_, value) => setGlobalStartDate(value)}
                                        className={`w-full px-3 py-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all ${
                                            (globalStartDate && !isWithinBounds(globalStartDate)) || isRangeViolation ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        End Date
                                    </label>
                                    <DateInput
                                        name="end_date"
                                        value={globalEndDate}
                                        onChange={(_, value) => setGlobalEndDate(value)}
                                        className={`w-full px-3 py-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all ${
                                            (globalEndDate && !isWithinBounds(globalEndDate)) || isRangeViolation ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                    />
                                </div>
                            </div>
                            {isDateViolation && (
                                <p className="mt-2 text-[10px] text-red-500 font-bold flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    {isRangeViolation
                                        ? 'End date cannot be before start date.'
                                        : globalStartDate && cycleCreated && globalStartDate < cycleCreated
                                        ? `Start date cannot be before cycle was created (${cycleCreated}).`
                                        : globalStartDate && cycleStart && globalStartDate < cycleStart
                                        ? `Start date must be on or after planting (${cycleStart}).`
                                        : `End date must be on or before harvest date (${cycleEnd}).`
                                    }
                                </p>
                            )}
                        </div>

                        {/* Scrollable line items */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Proposed Activities</p>
                                <p className="text-xs text-gray-400">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</p>
                            </div>

                            {lineItems.map((line, idx) => (
                                <div
                                    key={line.id}
                                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3 relative group"
                                >
                                    {/* Row number */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold uppercase text-gray-400">Activity #{idx + 1}</span>
                                        {lineItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLine(line.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {/* Activity Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Activity Name
                                            </label>
                                            <input
                                                type="text"
                                                value={line.activityName}
                                                onChange={e => updateLine(line.id, 'activityName', e.target.value)}
                                                placeholder="e.g. Weeding Block B1"
                                                required
                                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all placeholder-gray-400"
                                            />
                                        </div>

                                        {/* Row 2: Category & Estimated Cost */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Category */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                    Category
                                                </label>
                                                <select
                                                    value={line.category || ''}
                                                    onChange={e => updateLine(line.id, 'category', e.target.value)}
                                                    required
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                                                >
                                                    <option value="">Select Category...</option>
                                                    {budget_categories.length > 0
                                                        ? budget_categories.map(c => (
                                                            <option key={c.name} value={c.name}>{c.name}</option>
                                                          ))
                                                        : (
                                                            <>
                                                                <option value="Seeds">Seeds</option>
                                                                <option value="Fertilizers">Fertilizers</option>
                                                                <option value="Chemicals">Chemicals</option>
                                                                <option value="Labor">Labor</option>
                                                            </>
                                                          )
                                                    }
                                                </select>
                                            </div>

                                            {/* Estimated Cost */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Estimated Cost (Rwf)
                                                    </label>
                                                    {line.category && (() => {
                                                        const config = budget_categories.find(c => c.name === line.category);
                                                        const limit = config?.allocated || 0;
                                                        const usedByOthers = existingRequests
                                                            .filter(r => r.approvalStatus === 'Approved' || r.approvalStatus === 'Pending')
                                                            .flatMap(r => r.lineItems)
                                                            .filter(i => i.category === line.category)
                                                            .reduce((s, i) => s + i.estimatedCostRwf, 0);
                                                        const usedByOtherLines = lineItems
                                                            .filter(l => l.id !== line.id && l.category === line.category)
                                                            .reduce((s, l) => s + l.estimatedCostRwf, 0);
                                                        const remaining = limit - usedByOthers - usedByOtherLines - line.estimatedCostRwf;
                                                        const isOver = remaining < 0;
                                                        return (
                                                            <span className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {isOver
                                                                    ? `Over by ${Math.abs(remaining).toLocaleString()} Rwf`
                                                                    : `${remaining.toLocaleString()} Rwf left`
                                                                }
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="500"
                                                    value={line.estimatedCostRwf || ''}
                                                    onChange={e => updateLine(line.id, 'estimatedCostRwf', parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                    required
                                                    className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white transition-all placeholder-gray-400 ${
                                                        line.category && (getCategoryUsage(line.category) > (budget_categories.find(c => c.name === line.category)?.allocated || 0))
                                                            ? 'border-red-500 ring-2 ring-red-500/10 focus:ring-red-500/20 focus:border-red-500'
                                                            : 'border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add another activity */}
                            <button
                                type="button"
                                onClick={addLine}
                                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400 transition-all text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                Add Another Activity
                            </button>
                        </div>

                        {/* Footer: total + submit */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 space-y-3">
                            {/* Running total */}
                            <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                        Total Requested Amount
                                    </span>
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                                        {totalRwf.toLocaleString()} Rwf
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50">
                                        Total Allocation (Cycle)
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        {(budget_categories.reduce((s, c) => s + c.allocated, 0)).toLocaleString()} Rwf
                                    </span>
                                </div>
                            </div>

                            {/* Error messages / Validation hint */}
                            {submitError && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={14} />
                                    {submitError}
                                </div>
                            )}

                            {isOverBudget && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={13} />
                                    Category Budget Exceeded: You cannot request more than the remaining allocation for this specific category.
                                </p>
                            )}

                            {hasZeroCostActivity && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={13} />
                                    Every activity must have a cost greater than 0 Rwf.
                                </p>
                            )}

                            {hasDuplicateActivities && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={13} />
                                    Duplicate activity names found — each activity must be uniquely named.
                                </p>
                            )}

                            {hasSingleItemOverCategory && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={13} />
                                    A single activity cannot exceed the full budget for its category.
                                </p>
                            )}

                            {exceedsCycleTotal && !isOverBudget && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                                    <AlertCircle size={13} />
                                    Total requested ({totalRwf.toLocaleString()} Rwf) exceeds total cycle allocation ({totalCycleAllocation.toLocaleString()} Rwf).
                                </p>
                            )}

                            {periodTooLong && (
                                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                                    <AlertCircle size={13} />
                                    Request period cannot be longer than the crop cycle duration.
                                </p>
                            )}

                            {!isValid && !isOverBudget && !hasZeroCostActivity && !hasDuplicateActivities && !hasSingleItemOverCategory && !periodTooLong && lineItems.some(l => l.activityName) && !submitError && (
                                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    <AlertCircle size={13} />
                                    Please complete all fields for every activity before submitting.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!isValid}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isValid
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/10 active:scale-[0.98]'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Submit for PM Approval
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default BudgetActivityRequestModal;
