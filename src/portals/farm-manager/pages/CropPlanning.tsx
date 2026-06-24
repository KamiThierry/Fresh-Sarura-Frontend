import { useState } from 'react';
import {
    Sprout, AlertTriangle, CheckCircle2,
    Plus, Leaf, Coins, Camera,
    Clock, ScrollText, ChevronRight, Loader2
} from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';
import TaskExecutionModal from '../components/TaskExecutionModal';
import BudgetActivityRequestModal from '../components/BudgetActivityRequestModal';
import FMActivityLogModal from '../components/FMActivityLogModal';
import { useFarmManager } from '../../../lib/useFarmManager';
import type { Task, BudgetRequest, ActivityLineItem } from '../../shared/types/activity';
import { formatDate } from '@/lib/dateUtils';

// ─── Main Page ─────────────────────────────────────────────────────────────

const CropPlanning = () => {
    const {
        cycles,
        budgetRequests,
        loading,
        submitBudgetRequest,
        submitFieldReport,
        fetchCycles,
    } = useFarmManager();

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<any>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [logCycle, setLogCycle] = useState<any>(null);
    const { showToast } = useToastContext();

    const handleRequestClick = (cycle: any) => {
        setSelectedCycle(cycle);
        setIsRequestModalOpen(true);
    };

    const handleTaskClick = (task: any, cycle: any) => {
        console.log('CropPlanning: Task clicked', { task, cycle });
        if (!task.completed) {
            console.log('CropPlanning: Setting selectedTask and selectedCycle', { task, cycle });
            setSelectedTask(task);
            setSelectedCycle(cycle);
        } else {
            console.log('CropPlanning: Task already completed, ignoring click');
        }
    };

    // Submits a real field report to MongoDB
    const handleTaskComplete = async (
        _taskId: any,
        notes: string,
        hasProof: boolean,
        actualCostRwf: number | null,
        proofUrl: string | null,
        category: string | undefined,
        block: string | undefined
    ) => {
        console.log('CropPlanning: handleTaskComplete called with:', { notes, hasProof, actualCostRwf, proofUrl, category, block });
        if (!selectedTask || !selectedCycle) {
            console.warn('CropPlanning: ABORT - missing selectedTask or selectedCycle', { selectedTask, selectedCycle });
            return;
        }
        try {
            console.log('CropPlanning: Calling useFarmManager.submitFieldReport...');
            await submitFieldReport({
                cycleId: selectedCycle._id,
                description: selectedTask.title || 'Field Activity',
                block: block || selectedTask.block,
                category: category || selectedTask.category,
                approvedAmountRwf: selectedTask.approvedBudgetRwf,
                actualCostRwf: actualCostRwf || 0,
                notes,
                hasProof,
                proofUrl: proofUrl || undefined
            });
            console.log('CropPlanning: Field report success, fetching cycles...');
            showToast("Activity Logged", `Successfully recorded "${selectedTask.title}" operations.`);
            fetchCycles();
        } catch (err) {
            console.error('CropPlanning: Failed to submit field report:', err);
            showToast("Reporting Error", "Failed to save the field report. Please try again.");
        }
        setSelectedTask(null);
    };

    // Budget request → POST to MongoDB
    const handleBudgetRequestSubmit = async (request: BudgetRequest) => {
        try {
            const cleanLineItems = request.lineItems.map(item => ({
                activityName: item.activityName,
                category: item.category,
                estimatedCostRwf: item.estimatedCostRwf
            }));

            await submitBudgetRequest({
                cycleId: String(request.cycleId),
                cycleName: request.cycleName,
                startDate: request.startDate,
                endDate: request.endDate,
                lineItems: cleanLineItems,
            });
            setIsRequestModalOpen(false);
            setSelectedCycle(null);
            showToast("Request Submitted", "Your budget proposal has been sent to the Production Manager.");
        } catch (err) {
            console.error('Failed to submit budget request:', err);
            showToast("Request Failed", "Could not submit budget request. Please check your connection.");
            throw err; // Re-throw to allow modal to handle it
        }
    };

    // Map a DB cycle into the shape CycleCard expects
    const mapCycle = (cycle: any) => {
        // 2. Map all relevant "Tasks" (Approved requests, Rejected requests, and Flagged reports)
        const allActivityLogs: Task[] = (cycle.myRequests ?? [])
            .filter((r: any) => r.approvalStatus === 'Approved' || r.approvalStatus === 'Rejected')
            .flatMap((r: any) =>
                (r.lineItems ?? []).map((item: any, i: number) => {
                    const activityName = item.activityName;
                    
                    // Check if there is already a FIELD REPORT for this activity
                    // (only applies to approved items)
                    const existingReport = r.approvalStatus === 'Approved'
                        ? (cycle.myFieldReports ?? []).find(
                            (report: any) => report.description === activityName
                        )
                        : null;

                    return {
                        id: `${r._id}-${i}`,
                        title: activityName,
                        category: item.category,
                        date: r.endDate ? formatDate(r.endDate) : '—',
                        completed: !!existingReport,
                        proofRequired: true,
                        block: existingReport?.block || cycle.block_name || '',
                        approvedBudgetRwf: item.estimatedCostRwf,
                        actualCostRwf: existingReport?.actualCostRwf,
                        approvalStatus: r.approvalStatus as 'Approved' | 'Rejected',
                        pmNote: r.pmNote, // Reason for rejection / additional feedback
                    };
                })
            );

        // 3. Also include pure field reports that were FLAGGED by PM
        const flaggedReports: Task[] = (cycle.myFieldReports ?? [])
            .filter((report: any) => report.status === 'Flagged')
            .map((report: any) => ({
                id: report._id,
                title: report.description || 'Field Activity',
                category: report.category,
                date: report.createdAt ? formatDate(report.createdAt) : '—',
                completed: false, // Flagged means it needs correction
                proofRequired: report.hasProof,
                block: report.block || cycle.block_name || '',
                approvedBudgetRwf: report.approvedAmountRwf,
                actualCostRwf: report.actualCostRwf,
                approvalStatus: 'Flagged' as const,
                pmNote: report.pmFlag, // PM note about why it was flagged
                fieldNote: report.notes,
                proofUrl: report.proofUrl,
            }));

        const combinedLogs = [...allActivityLogs, ...flaggedReports];

        const pendingForThisCycle: BudgetRequest[] = budgetRequests
            .filter((r: any) => r.cycleId === cycle._id && r.approvalStatus === 'Pending')
            .map((r: any) => ({
                id: r._id,
                cycleId: cycle._id,
                cycleName: r.cycleName,
                submittedBy: r.submittedByName || 'Farm Manager',
                submittedAt: r.createdAt,
                startDate: r.startDate,
                endDate: r.endDate,
                lineItems: r.lineItems ?? [],
                totalRequestedRwf: r.totalRequestedRwf,
                approvalStatus: 'Pending' as const,
            }));

        return {
            _id: cycle._id,
            id: cycle._id,
            crop: cycle.crop_name,
            variety: cycle.block_name || cycle.season,
            season: cycle.season,
            stage: 'Vegetative' as const,
            status: cycle.status as 'Active' | 'Harvesting' | 'Completed',
            budgetUsed:
                cycle.total_budget > 0
                    ? Math.round(((cycle.spent ?? 0) / cycle.total_budget) * 100)
                    : 0,
            targetYield: cycle.yield_goal || 'TBD',
            nextMilestone: cycle.expected_harvest_date
                ? `Harvest by ${formatDate(cycle.expected_harvest_date)}`
                : 'No milestone set',
            tasks: combinedLogs,
            _pendingRequests: pendingForThisCycle,
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={28} className="animate-spin text-green-500" />
            </div>
        );
    }

    const mappedCycles = cycles.map(mapCycle);

    return (
        <div className="p-4 md:p-6 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Sprout className="text-green-600" />
                        My Active Crop Cycles
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your active blocks, track approved budgets, and log field operations.
                    </p>
                </div>
            </div>

            {/* Content Grid */}
            {mappedCycles.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {mappedCycles.map(cycle => (
                        <CycleCard
                            key={cycle._id}
                            cycle={cycle}
                            extraTasks={[]}
                            pendingRequests={cycle._pendingRequests}
                            onRequestInput={() => handleRequestClick(cycles.find(c => c._id === cycle._id))}
                            onTaskClick={(task) => handleTaskClick(task, cycle)}
                            onViewLog={() => setLogCycle(cycle)}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState />
            )}

            {/* Budget & Activity Request Modal */}
            {isRequestModalOpen && selectedCycle && (
                <BudgetActivityRequestModal
                    isOpen={isRequestModalOpen}
                    onClose={() => { setIsRequestModalOpen(false); setSelectedCycle(null); }}
                    cycleId={selectedCycle._id}
                    cycleName={`${selectedCycle.crop_name} — ${selectedCycle.season}`}
                    cycleStartDate={selectedCycle.start_date}
                    cycleEndDate={selectedCycle.expected_harvest_date}
                    cycleCreatedAt={selectedCycle.createdAt}
                    budget_categories={selectedCycle.budget_categories || []}
                    existingRequests={selectedCycle.myRequests || []}
                    onSubmit={handleBudgetRequestSubmit}
                />
            )}

            {/* Task Execution Modal */}
            {selectedTask && (
                <TaskExecutionModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onComplete={handleTaskComplete}
                />
            )}

            {/* Activity Log Modal */}
            {logCycle && (
                <FMActivityLogModal
                    cycleName={`${logCycle.crop} — ${logCycle.season}`}
                    tasks={logCycle.tasks}
                    onClose={() => setLogCycle(null)}
                    onResubmit={(task: Task) => {
                        setLogCycle(null);
                        setSelectedTask(task);
                    }}
                />
            )}
        </div>
    );
};

// ─── CycleCard ─────────────────────────────────────────────────────────────

type CardTab = 'plan' | 'pending';

interface CycleCardProps {
    cycle: any;
    extraTasks: Task[];
    pendingRequests: BudgetRequest[];
    onRequestInput: () => void;
    onTaskClick: (task: Task) => void;
    onViewLog: () => void;
}

const CycleCard = ({
    cycle,
    extraTasks,
    pendingRequests,
    onRequestInput,
    onTaskClick,
    onViewLog,
}: CycleCardProps) => {
    const [activeTab, setActiveTab] = useState<CardTab>('plan');

    const getBudgetColor = (p: number) =>
        p > 90 ? 'bg-red-500' : p > 75 ? 'bg-orange-400' : 'bg-green-500';
    const getBudgetTextColor = (p: number) =>
        p > 90
            ? 'text-red-600'
            : p > 75
                ? 'text-orange-600'
                : 'text-gray-600 dark:text-gray-400';

    const pendingItems: (ActivityLineItem & { submittedAt: string })[] =
        pendingRequests.flatMap(r =>
            r.lineItems.map(li => ({ ...li, submittedAt: r.submittedAt }))
        );

    const pendingCount = pendingItems.length;

    const approvedTasks = [...cycle.tasks, ...extraTasks].filter(
        (t: Task) => !t.approvalStatus || t.approvalStatus === 'Approved'
    );

    const fmtRwf = (n: number) => `${n.toLocaleString()} Rwf`;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

            {/* Card Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-700/20">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{cycle.crop}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cycle.status === 'Harvesting'
                            ? 'bg-amber-100 text-amber-700 animate-pulse'
                            : cycle.status === 'Completed'
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {cycle.status === 'Completed' ? 'Closed' : cycle.status === 'Harvesting' ? 'Harvesting' : cycle.stage}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {cycle.variety} • {cycle.season}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 flex items-center justify-center shadow-sm">
                    <Leaf size={20} className="text-green-600" />
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 flex-1">

                {/* Budget Bar */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Coins size={14} className="text-gray-400" />
                            Budget Usage
                        </span>
                        <span className={`text-xs font-bold ${getBudgetTextColor(cycle.budgetUsed)}`}>
                            {cycle.budgetUsed}% Used
                        </span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getBudgetColor(cycle.budgetUsed)}`}
                            style={{ width: `${cycle.budgetUsed}%` }}
                        />
                    </div>
                    {cycle.budgetUsed > 90 && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                            <AlertTriangle size={10} />
                            Critical: Budget nearly exhausted.
                        </p>
                    )}
                </div>

                {/* Key Details */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Target Yield</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{cycle.targetYield}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Next Milestone</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{cycle.nextMilestone}</p>
                    </div>
                </div>

                {/* Tabbed Task Section */}
                <div>
                    <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-700 mb-3">
                        <button
                            onClick={() => setActiveTab('plan')}
                            className={`relative pb-2 px-1 text-xs font-bold transition-colors ${activeTab === 'plan'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            Action Plan
                            {activeTab === 'plan' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`relative pb-2 px-1 text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === 'pending'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            Pending Requests
                            {pendingCount > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'pending'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    {pendingCount}
                                </span>
                            )}
                            {activeTab === 'pending' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-amber-500" />
                            )}
                        </button>
                    </div>

                    {/* Action Plan Tab */}
                    {activeTab === 'plan' && (
                        <div className="space-y-1">
                            {approvedTasks.length === 0 ? (
                                <p className="text-xs text-gray-400 italic text-center py-3">
                                    No approved activities yet. Submit a budget request to get started.
                                </p>
                            ) : (
                                approvedTasks.map((task: Task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => {
                                            console.log('CycleCard: Task DIV clicked', task);
                                            if (cycle.status !== 'Completed') onTaskClick(task);
                                        }}
                                        className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-all border border-transparent ${task.completed || cycle.status === 'Completed'
                                            ? 'opacity-60 cursor-default'
                                            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-100 dark:hover:border-gray-600 active:scale-[0.99] group'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.completed
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300 dark:border-gray-600 group-hover:border-emerald-500'
                                            }`}>
                                            {task.completed && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-xs flex-1 truncate ${task.completed
                                            ? 'text-gray-400 line-through'
                                            : 'text-gray-700 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                                            }`}>
                                            {task.title}
                                        </span>
                                        {task.proofRequired && !task.completed && cycle.status !== 'Completed' && (
                                            <Camera size={12} className="text-gray-400 group-hover:text-emerald-500 shrink-0" />
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-700 whitespace-nowrap">
                                            {task.date}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Pending Requests Tab */}
                    {activeTab === 'pending' && (
                        <div className="space-y-1.5">
                            {pendingItems.length === 0 ? (
                                <div className="text-center py-5">
                                    <p className="text-xs text-gray-400 italic">No pending requests for this cycle.</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Use "Request Inputs / Funds" to submit activities.</p>
                                </div>
                            ) : (
                                pendingItems.map((item, idx) => (
                                    <div
                                        key={`${item.id}-${idx}`}
                                        className="flex items-center gap-3 py-2 px-2 rounded-lg border border-amber-100 dark:border-amber-900/20 bg-amber-50/50 dark:bg-amber-900/5"
                                    >
                                        <div className="w-4 h-4 rounded border border-dashed border-amber-300 dark:border-amber-700 shrink-0" />
                                        <span className="text-xs flex-1 truncate text-gray-700 dark:text-gray-300">
                                            {item.activityName}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                            {fmtRwf(item.estimatedCostRwf)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap shrink-0">
                                            <Clock size={8} />
                                            Pending PM
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <button
                    onClick={onViewLog}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1"
                >
                    <ScrollText size={12} />
                    View Activity Log
                    <ChevronRight size={11} />
                </button>
                {cycle.status !== 'Completed' && (
                    <button
                        onClick={onRequestInput}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Request Inputs / Funds
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Empty State ────────────────────────────────────────────────────────────

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Sprout size={40} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">No active crop cycles</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            You don't have any assigned crops for this season. Contact your Production Manager to get started.
        </p>
    </div>
);

export default CropPlanning;