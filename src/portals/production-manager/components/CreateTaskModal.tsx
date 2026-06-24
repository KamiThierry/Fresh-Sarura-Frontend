import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Flag, Camera, CheckCircle2 } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: any) => void;
}

const CreateTaskModal = ({ isOpen, onClose, onSubmit }: CreateTaskModalProps) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [assignee, setAssignee] = useState('');
    const [requireProof, setRequireProof] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dueDate);

        if (selectedDate < today) {
            alert('Due date cannot be in the past.');
            return;
        }

        // Construct the new task object
        const newTask = {
            id: Date.now(), // Simple ID generation
            activity: title,
            dueDate: new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Pending',
            assignedTo: assignee.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2), // Initials
            subtext: `Assigned to ${assignee}`,
            proof: requireProof,
            priority: priority
        };

        onSubmit(newTask);

        // Reset and close
        setTitle('');
        setDueDate('');
        setPriority('Normal');
        setAssignee('');
        setRequireProof(false);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/30">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Assign New Operational Task</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-5">

                        {/* Task Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Task Name</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Weeding Sector 4"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Due Date */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-gray-400" /> Due Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            {/* Priority */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <Flag size={14} className="text-gray-400" /> Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                <User size={14} className="text-gray-400" /> Assignee
                            </label>
                            <select
                                required
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                            >
                                <option value="" disabled>Select Farm Manager</option>
                                <option value="Jean Pierre">Jean Pierre</option>
                                <option value="Sarah M.">Sarah M.</option>
                                <option value="Robert W.">Robert W.</option>
                            </select>
                        </div>

                        {/* Compliance Section */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${requireProof ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <Camera size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Require Photo Evidence?</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={requireProof}
                                        onChange={(e) => setRequireProof(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                If enabled, the farm manager must upload a photo to complete this task. Used for compliance audits.
                            </p>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Assign Task
                        </button>
                    </div>
                </form>

            </div>
        </div>,
        document.body
    );
};

export default CreateTaskModal;
