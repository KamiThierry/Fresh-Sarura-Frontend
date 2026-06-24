import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Flag, CheckCircle2 } from 'lucide-react';

interface ScheduleInspectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (inspection: any) => void;
}

const ScheduleInspectionModal = ({ isOpen, onClose, onSubmit }: ScheduleInspectionModalProps) => {
    const [formData, setFormData] = useState({
        batchId: '',
        inspectorId: '',
        date: '',
        time: '',
        priority: 'Medium',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(formData.date);

        if (selectedDate < today) {
            alert('Inspection date cannot be in the past.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            onSubmit(formData);
            setIsSubmitting(false);
            // Reset form
            setFormData({
                batchId: '',
                inspectorId: '',
                date: '',
                time: '',
                priority: 'Medium',
                notes: ''
            });
        }, 800);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="text-blue-600" size={24} />
                            Schedule Inspection
                        </h2>
                        <p className="text-xs text-gray-500">Assign an inspector to a batch</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="inspection-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Batch Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Batch
                            </label>
                            <select
                                required
                                value={formData.batchId}
                                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">Select a batch...</option>
                                <option value="B-2026-001">B-2026-001 (Avocados)</option>
                                <option value="B-2026-002">B-2026-002 (French Beans)</option>
                                <option value="B-2026-003">B-2026-003 (Chili)</option>
                            </select>
                        </div>

                        {/* Inspector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Assign Inspector
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    required
                                    value={formData.inspectorId}
                                    onChange={(e) => setFormData({ ...formData, inspectorId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">Select Inspector...</option>
                                    <option value="INS-001">Sarah M. (Senior QC)</option>
                                    <option value="INS-002">John D. (Field Officer)</option>
                                    <option value="INS-003">Alice W. (Junior QC)</option>
                                </select>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority Level
                            </label>
                            <div className="flex gap-3">
                                {['Low', 'Medium', 'High'].map((p) => (
                                    <button
                                        type="button"
                                        key={p}
                                        onClick={() => setFormData({ ...formData, priority: p })}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${formData.priority === p
                                            ? p === 'High' ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : p === 'Medium' ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                    : 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Flag size={14} className={formData.priority === p ? 'fill-current' : ''} />
                                            {p}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Special Instructions
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="E.g. Check for specific pests..."
                            />
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="inspection-form"
                            disabled={isSubmitting}
                            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Confirm Schedule
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default ScheduleInspectionModal;
