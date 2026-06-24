import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Truck } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface LogIntakeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (weight: number) => void;
}

const LogIntakeModal = ({ isOpen, onClose, onSubmit }: LogIntakeModalProps) => {
    const [formData, setFormData] = useState({
        farmerId: '',
        produceType: 'Avocados',
        weight: '',
        source: 'field',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToastContext();

    // Mock Farmers Data
    const farmers = [
        { id: 'F001', name: 'Jean Paul Habimana' },
        { id: 'F002', name: 'Marie Claire Uwase' },
        { id: 'F003', name: 'Emmanuel Ndayisenga' },
    ];

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            const weightNum = parseFloat(formData.weight);
            if (!isNaN(weightNum)) {
                onSubmit(weightNum);
                showToast("Intake Logged", `${weightNum}kg of ${formData.produceType} recorded successfully.`);
            }
            setIsSubmitting(false);
            onClose();
            // Reset form (optional, or keep state for next time)
            setFormData(prev => ({ ...prev, weight: '', notes: '' }));
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
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Truck className="text-green-600" size={24} />
                            Log New Intake
                        </h2>
                        <p className="text-xs text-gray-500">Record incoming produce from farmers</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <form id="intake-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Farmer Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Farmer / Source
                            </label>
                            <select
                                required
                                value={formData.farmerId}
                                onChange={(e) => setFormData({ ...formData, farmerId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            >
                                <option value="">Select Farmer...</option>
                                {farmers.map(f => (
                                    <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                                ))}
                            </select>
                        </div>

                        {/* Produce Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Produce Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Avocados', 'French Beans', 'Chili', 'Passion Fruit'].map((type) => (
                                    <button
                                        type="button"
                                        key={type}
                                        onClick={() => setFormData({ ...formData, produceType: type })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${formData.produceType === type
                                            ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Weight & Units */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Net Weight (kg)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    min="1"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-lg font-semibold"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                    KG
                                </span>
                            </div>
                        </div>

                        {/* Collection Source */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Collection Source
                            </label>
                            <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, source: 'field' })}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.source === 'field'
                                        ? 'bg-white text-green-700 shadow-sm dark:bg-gray-600 dark:text-green-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    Field Collection
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, source: 'truck' })}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.source === 'truck'
                                        ? 'bg-white text-green-700 shadow-sm dark:bg-gray-600 dark:text-green-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    Truck Delivery
                                </button>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes / Quality Remarks
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                placeholder="Any observations about quality..."
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
                            form="intake-form"
                            disabled={isSubmitting}
                            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Confirm Intake
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

export default LogIntakeModal;
