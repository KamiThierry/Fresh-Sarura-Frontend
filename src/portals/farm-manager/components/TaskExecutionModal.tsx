import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Camera, UploadCloud, AlertCircle,
    CheckCircle2, Clock, FileText, Trash2,
    CalendarRange, Coins, MapPin
} from 'lucide-react';
import type { Task } from '../../shared/types/activity';

interface TaskExecutionModalProps {
    task: Task;
    onClose: () => void;
    onComplete: (taskId: string | number, notes: string, hasProof: boolean, actualCostRwf: number | null, proofUrl: string | null, category: string | undefined, block: string | undefined) => void;
}

const TaskExecutionModal = ({ task, onClose, onComplete }: TaskExecutionModalProps) => {
    const [notes, setNotes] = useState(task.fieldNote || '');
    const [proofImage, setProofImage] = useState<string | null>(task.proofUrl || null);
    const [actualCost, setActualCost] = useState<string>(task.actualCostRwf?.toString() || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // V6.2 Core Logic: Hard Budget Block
    const approvedBudget = task.approvedBudgetRwf ?? task.estimatedCostRwf ?? 0;
    const actual = parseFloat(actualCost) || 0;
    const isOverBudget = approvedBudget > 0 && actual > approvedBudget;
    
    // Variance is still calculated for display but no longer allows submission if >0
    const variancePercent = approvedBudget > 0 ? Math.round(((actual - approvedBudget) / approvedBudget) * 100) : 0;

    const needsNoteForVariance = approvedBudget > 0 && actual > (approvedBudget * 1.5) && !notes.trim();
    const canComplete = (!task.proofRequired || (task.proofRequired && proofImage)) && !isOverBudget && !needsNoteForVariance;

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setProofImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveProof = () => {
        setProofImage(null);
    };

    const isOverdue = true;

    // Helper to format numbers as Rwf
    const fmtRwf = (n: number) => `${n.toLocaleString()} Rwf`;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[85vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    <Clock size={10} /> Due Today
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    Due {task.date}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                            {task.title}
                        </h2>
                        {task.block && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-emerald-500" />
                                {task.block}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0 mt-0.5"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* Approved Scope Panel (replaces SOP) */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                            Approved Scope
                        </h3>
                        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <CalendarRange size={14} className="text-emerald-600 shrink-0" />
                                <span className="font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">Approved Period:</span>
                                <span className="font-bold">{task.startDate ?? task.date} — {task.endDate ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Coins size={14} className="text-emerald-600 shrink-0" />
                                <span className="font-semibold text-gray-500 dark:text-gray-400 min-w-[120px]">Approved Budget:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                    {task.approvedBudgetRwf != null ? fmtRwf(task.approvedBudgetRwf) : (task.estimatedCostRwf != null ? fmtRwf(task.estimatedCostRwf) : '—')}
                                </span>
                            </div>
                        </div>

                        {/* Category & Block Auto-populated */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Category</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.category || 'General'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Block</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.block || '—'}</p>
                            </div>
                        </div>

                        {task.proofRequired && (
                            <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-medium">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <p>Photo evidence is required to submit this field report. Please upload a clear photo of the completed work.</p>
                            </div>
                        )}
                    </div>

                    {/* Actual Cost Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Coins size={16} className="text-emerald-600 dark:text-emerald-400" />
                            Actual Cost Incurred (Rwf)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                            placeholder="e.g. 45000"
                            className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                                isOverBudget 
                                ? 'border-red-300 dark:border-red-800/60 focus:ring-red-500/40' 
                                : 'border-gray-200 dark:border-gray-600 focus:ring-emerald-500/40'
                            }`}
                        />
                        
                        {/* V6.2 Hard Budget Block Alert */}
                        {isOverBudget && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={18} className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-800 dark:text-red-400">
                                        Budget Limit Exceeded
                                    </p>
                                    <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-0.5 leading-relaxed">
                                        Actual cost ({fmtRwf(actual)}) cannot exceed the approved budget for this task ({fmtRwf(approvedBudget)}). Please contact the PM to request a budget adjustment if additional funds are required.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* V6 High Variance Warning (Now only shown if not strictly over budget, though V6.2 makes this mostly redundant for overruns) */}
                        {!isOverBudget && approvedBudget > 0 && actual > (approvedBudget * 1.5) && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={18} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                                        High Variance Warning
                                    </p>
                                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-0.5">
                                        A note is required for variances exceeding 50%.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Proof of Work / Receipts Upload */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Camera size={16} className="text-emerald-600 dark:text-emerald-400" />
                            Proof of Work / Receipts
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                            Please upload a photo of the completed field work or the material receipt.
                        </p>

                        {!proofImage ? (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={handleUploadClick}
                                    className="w-full h-32 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all bg-gray-50/60 dark:bg-gray-700/30"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center">
                                        <UploadCloud size={18} />
                                    </div>
                                    <span className="text-sm font-semibold">Tap to Take Photo / Upload</span>
                                </button>
                            </>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                <img src={proofImage} alt="Proof of Work" className="w-full h-44 object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={handleRemoveProof}
                                        className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/20 flex items-center gap-2 border border-white/20"
                                    >
                                        <Trash2 size={15} /> Remove
                                    </button>
                                </div>
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 size={10} /> Uploaded
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Field Notes & Variances */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                                Field Notes & Variances
                            </span>
                            {isOverBudget ? (
                                <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold tracking-wider">Blocked</span>
                            ) : approvedBudget > 0 && actual > (approvedBudget * 1.5) ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">Required for variance</span>
                            ) : (
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Optional</span>
                            )}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Log any issues, weather delays, or reasons for budget variances..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition resize-none"
                            rows={3}
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 space-y-2.5">
                    {task.proofRequired && !proofImage && (
                        <p className="text-xs text-center text-red-500 font-medium">
                            * Please upload proof of work or a receipt to submit
                        </p>
                    )}
                    {needsNoteForVariance && !isOverBudget && (
                        <p className="text-xs text-center text-amber-600 dark:text-amber-500 font-medium">
                            * Note required to justify the {variancePercent}% budget overrun
                        </p>
                    )}
                    {isOverBudget && (
                        <p className="text-xs text-center text-red-500 font-bold">
                            * Cannot submit: Amount exceeds approved budget
                        </p>
                    )}
                    <button
                        onClick={() => {
                            console.log('TaskExecutionModal: Submit clicked', { taskId: task.id, notes, proofImage });
                            onComplete(task.id, notes, !!proofImage, actualCost ? parseFloat(actualCost) : null, proofImage, task.category, task.block);
                        }}
                        disabled={!canComplete}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${canComplete
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25 active:scale-[0.98]'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <CheckCircle2 size={17} />
                        Submit Field Report
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default TaskExecutionModal;
