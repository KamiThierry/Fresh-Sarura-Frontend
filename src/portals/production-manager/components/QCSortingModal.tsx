import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Scale, Layers, Info, Award, AlertCircle, ArrowRight } from 'lucide-react';

interface QCSortingModalProps {
    isOpen: boolean;
    onClose: () => void;
    intakeId: string; // The ID of the intake being processed
    onConfirm: () => void;
}

const QCSortingModal = ({ isOpen, onClose, intakeId, onConfirm }: QCSortingModalProps) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        gradeA: '',
        rejected: '',
        storageLocation: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock Intake Data (In a real app, fetch based on intakeId)
    const intakeData = {
        id: intakeId || 'INT-2026-001',
        produce: 'Avocados (Hass)',
        totalWeight: 1200,
        supplier: 'Kinvest Farm'
    };

    const calculatedTotal = (
        (parseFloat(formData.gradeA) || 0) +
        (parseFloat(formData.rejected) || 0)
    );

    const remainingWeight = intakeData.totalWeight - calculatedTotal;
    const isWeightMatching = Math.abs(remainingWeight) < 1; // 1kg tolerance

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            onConfirm();
            onClose();
        }, 1000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Layers className="text-indigo-600" size={24} />
                            Sorting & Grading
                        </h2>
                        <p className="text-xs text-gray-500">Record sorting weights for Intake #{intakeData.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">

                    {/* Intake Summary Card */}
                    <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                        <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                <Scale size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wide opacity-80">Total Received</p>
                                <p className="text-2xl font-bold text-indigo-900 dark:text-white">{intakeData.totalWeight} kg</p>
                            </div>
                        </div>

                        <div className="flex-1 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <Info size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide opacity-80">Remaining to Sort</p>
                                <p className={`text-2xl font-bold ${remainingWeight < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                    {remainingWeight.toLocaleString()} kg
                                </p>
                            </div>
                        </div>
                    </div>

                    <form id="sorting-form" onSubmit={handleSubmit} className="space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Grade A */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    Grade A
                                </label>
                                <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-900/30 focus-within:border-green-500 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-500 uppercase font-medium">Export Quality</span>
                                        <Award size={16} className="text-green-500" />
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.gradeA}
                                            onChange={(e) => setFormData({ ...formData, gradeA: e.target.value })}
                                            className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white outline-none placeholder-gray-200 dark:placeholder-gray-700"
                                            placeholder="0"
                                        />
                                        <span className="text-sm text-gray-400 font-medium">kg</span>
                                    </div>
                                </div>
                            </div>

                            {/* Rejected */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    Rejected
                                </label>
                                <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 focus-within:border-red-500 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-500 uppercase font-medium">Waste / Compost</span>
                                        <AlertCircle size={16} className="text-red-500" />
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.rejected}
                                            onChange={(e) => setFormData({ ...formData, rejected: e.target.value })}
                                            className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white outline-none placeholder-gray-200 dark:placeholder-gray-700"
                                            placeholder="0"
                                        />
                                        <span className="text-sm text-gray-400 font-medium">kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Storage Location */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">
                                Assign Storage Bin
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['Cool Room A', 'Cool Room B', 'Ambient Storage', 'Dispatch'].map((loc) => (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, storageLocation: loc })}
                                        className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium transition-all ${formData.storageLocation === loc
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                                            }`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rejection Reason (Conditional) */}
                        {Number(formData.rejected) > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Primary Reason for Rejection
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Select Reason...</option>
                                    <option>Pest Damage</option>
                                    <option>Mechanical Damage</option>
                                    <option>Undersized</option>
                                    <option>Rot / Mold</option>
                                </select>
                            </div>
                        )}

                    </form>

                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        {remainingWeight === 0 ? (
                            <span className="text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle size={14} /> Weights Matched
                            </span>
                        ) : (
                            <span>Adjust weights to match total</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="sorting-form"
                            disabled={remainingWeight !== 0 || isSubmitting}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                            {isSubmitting ? 'Submitting...' : 'Confirm Sorting'}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default QCSortingModal;
