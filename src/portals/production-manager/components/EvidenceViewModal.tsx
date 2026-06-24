import { X, CheckCircle2, XCircle, Calendar, ExternalLink } from 'lucide-react';

interface EvidenceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any; // Using any for mock flexibility
    onApprove: (taskId: number) => void;
    onReject: (taskId: number) => void;
}

const EvidenceViewModal = ({ isOpen, onClose, task, onApprove, onReject }: EvidenceViewModalProps) => {
    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            Evidence Review
                            <span className="px-2 py-0.5 rounded textxs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs uppercase tracking-wide">
                                Pending Approval
                            </span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Task: {task.activity}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-white bg-black/20 hover:bg-black/40">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Split View */}
                <div className="flex-1 overflow-y-auto p-0 md:flex">

                    {/* Image Area */}
                    <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-0 relative group">
                        <img
                            src="https://images.unsplash.com/photo-1625246333195-bf7f85822e3d?auto=format&fit=crop&q=80&w=800"
                            alt="Evidence"
                            className="max-w-full max-h-[60vh] object-contain"
                        />
                        <a
                            href="https://images.unsplash.com/photo-1625246333195-bf7f85822e3d?auto=format&fit=crop&q=80&w=800"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 right-4 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>

                    {/* Meta Data Sidebar */}
                    <div className="w-full md:w-80 p-6 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 space-y-6">

                        {/* Assigned User */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                                {task.assignedTo}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Jean Pierre</p>
                                <p className="text-xs text-gray-500">Farm Manager</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</label>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                                    <Calendar size={14} />
                                    Oct 10, 2024 • 14:30
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</label>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                                    Sector 4, Row 12-15
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</label>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
                                    "Completed weeding and applied mulch as requested. Conditions were dry."
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <button
                                onClick={() => onApprove(task.id)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Approve Evidence
                            </button>
                            <button
                                onClick={() => onReject(task.id)}
                                className="w-full py-2.5 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <XCircle size={18} />
                                Reject & Request Retake
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default EvidenceViewModal;
