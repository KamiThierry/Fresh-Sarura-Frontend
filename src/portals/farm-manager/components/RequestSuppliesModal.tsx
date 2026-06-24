import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Plus, Trash2, ClipboardList, 
    CheckCircle2, AlertCircle 
} from 'lucide-react';
import type { ActivityLineItem, BudgetRequest } from '../../shared/types/activity';

interface RequestSuppliesModalProps {
    isOpen: boolean;
    onClose: () => void;
    cycles: any[];
    onSubmit: (request: BudgetRequest) => Promise<void>;
}

const emptyLine = (): ActivityLineItem => ({
    id: Date.now() + Math.random(),
    activityName: '',
    category: '',
    estimatedCostRwf: 0,
});

const RequestSuppliesModal = ({ 
    isOpen, 
    onClose, 
    cycles, 
    onSubmit 
}: RequestSuppliesModalProps) => {
    const [selectedCycleId, setSelectedCycleId] = useState<string>('');
    const [lineItems, setLineItems] = useState<ActivityLineItem[]>([emptyLine()]);
    const [globalStartDate, setGlobalStartDate] = useState('');
    const [globalEndDate, setGlobalEndDate] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default to first cycle if available
    useEffect(() => {
        if (isOpen && cycles.length > 0 && !selectedCycleId) {
            setSelectedCycleId(cycles[0]._id);
        }
    }, [isOpen, cycles, selectedCycleId]);

    if (!isOpen) return null;

    const totalRwf = lineItems.reduce((sum, l) => sum + (l.estimatedCostRwf || 0), 0);
    const selectedCycle = cycles.find(c => c._id === selectedCycleId);

    const updateLine = (id: number, field: keyof ActivityLineItem, value: string | number) => {
        setLineItems(prev =>
            prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
        );
    };

    const addLine = () => setLineItems(prev => [...prev, emptyLine()]);

    const removeLine = (id: number) => {
        if (lineItems.length === 1) return;
        setLineItems(prev => prev.filter(l => l.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCycle) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(globalStartDate);
        const end = new Date(globalEndDate);

        if (start < today) {
            setError('Start date cannot be in the past.');
            setIsSubmitting(false);
            return;
        }

        if (end < start) {
            setError('End date cannot be before start date.');
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const request: BudgetRequest = {
                id: Date.now(),
                cycleId: selectedCycle._id,
                cycleName: `${selectedCycle.crop_name} — ${selectedCycle.season}`,
                submittedBy: 'Farm Manager',
                submittedAt: new Date().toISOString(),
                startDate: globalStartDate,
                endDate: globalEndDate,
                lineItems,
                totalRequestedRwf: totalRwf,
                approvalStatus: 'Pending',
            };

            await onSubmit(request);
            setSubmitted(true);

            setTimeout(() => {
                setSubmitted(false);
                setLineItems([emptyLine()]);
                onClose();
            }, 1800);
        } catch (err: any) {
            console.error('Failed to submit request:', err);
            setError(err.message || 'Failed to submit request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = selectedCycleId && globalStartDate && globalEndDate && lineItems.every(
        l => l.activityName.trim() && l.category && l.estimatedCostRwf > 0
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                            <ClipboardList size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Inputs & Funds</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Select cycle and propose activities
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your budget request is awaiting PM approval.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        {error && (
                            <div className="px-6 py-3">
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}
                        {/* Selector Section */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Target Crop Cycle
                                </label>
                                <select
                                    value={selectedCycleId}
                                    onChange={e => setSelectedCycleId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all font-medium"
                                >
                                    <option value="" disabled>Select a cycle...</option>
                                    {cycles.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.crop_name} — {c.season} ({c.block_name || 'Generic Block'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={globalStartDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setGlobalStartDate(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={globalEndDate}
                                        min={globalStartDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setGlobalEndDate(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scrollable line items */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Proposed Activities</p>
                                <p className="text-xs text-gray-400">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</p>
                            </div>

                            {lineItems.map((line, idx) => (
                                <div
                                    key={line.id}
                                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-sm space-y-3 relative group"
                                >
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
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Activity Name
                                            </label>
                                            <input
                                                type="text"
                                                value={line.activityName}
                                                onChange={e => updateLine(line.id, 'activityName', e.target.value)}
                                                placeholder="e.g. Weeding, Seeds, Fertilizers..."
                                                required
                                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all placeholder-gray-400"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
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
                                                    <option value="Seeds & Seedlings">Seeds & Seedlings</option>
                                                    <option value="Fertilizers">Fertilizers</option>
                                                    <option value="Chemicals">Chemicals</option>
                                                    <option value="Labor">Labor</option>
                                                    <option value="Tools & Equipment">Tools & Equipment</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                    Estimated Cost (Rwf)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={line.estimatedCostRwf || ''}
                                                    onChange={e => updateLine(line.id, 'estimatedCostRwf', parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                    required
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

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
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 space-y-3 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                    Total Amount
                                </span>
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                                    {totalRwf.toLocaleString()} Rwf
                                </span>
                            </div>

                            {!isValid && lineItems.some(l => l.activityName) && (
                                <p className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium justify-center">
                                    <AlertCircle size={12} />
                                    Please complete all required fields.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isValid && !isSubmitting
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/10 active:scale-[0.98]'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default RequestSuppliesModal;
