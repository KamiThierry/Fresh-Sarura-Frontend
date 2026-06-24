import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plane, Package, FileText, Calendar } from 'lucide-react';

interface CreateShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (weight: number) => void;
}

const CreateShipmentModal = ({ isOpen, onClose, onSubmit }: CreateShipmentModalProps) => {
    const [formData, setFormData] = useState({
        destination: 'DXB',
        flightNumber: '',
        departureTime: '',
        consignee: '',
        weight: '',
        docs: {
            packingList: true,
            invoice: true,
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            const weightNum = parseFloat(formData.weight);
            if (!isNaN(weightNum)) {
                onSubmit(weightNum);
            }
            setIsSubmitting(false);
            // Reset critical fields
            setFormData(prev => ({ ...prev, weight: '', flightNumber: '', consignee: '' }));
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
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Plane className="text-purple-600" size={24} />
                            Create Export Shipment
                        </h2>
                        <p className="text-xs text-gray-500">Book logistics and generate documents</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="shipment-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Destination */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Destination Airport
                            </label>
                            <select
                                required
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            >
                                <option value="DXB">Dubai (DXB) - UAE</option>
                                <option value="LHR">London Heathrow (LHR) - UK</option>
                                <option value="BRU">Brussels (BRU) - Belgium</option>
                                <option value="AMS">Amsterdam (AMS) - Netherlands</option>
                            </select>
                        </div>

                        {/* Flight Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Flight Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. WB 300"
                                    value={formData.flightNumber}
                                    onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Departure Time
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.departureTime}
                                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        {/* Consignee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Consignee / Buyer
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Carrefour Hypermarket"
                                value={formData.consignee}
                                onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Booked Weight (kg)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg font-bold"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                    KG
                                </span>
                            </div>
                        </div>

                        {/* Documents Checklist */}
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50">
                            <h4 className="flex items-center gap-2 font-semibold text-purple-800 dark:text-purple-300 mb-3 text-sm">
                                <FileText size={16} /> Generated Documents
                            </h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.docs.packingList}
                                        onChange={() => setFormData(prev => ({ ...prev, docs: { ...prev.docs, packingList: !prev.docs.packingList } }))}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Generate Packing List</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.docs.invoice}
                                        onChange={() => setFormData(prev => ({ ...prev, docs: { ...prev.docs, invoice: !prev.docs.invoice } }))}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Generate Commercial Invoice</span>
                                </label>
                            </div>
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
                            form="shipment-form"
                            disabled={isSubmitting}
                            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Package size={18} />
                                    Book Shipment
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

export default CreateShipmentModal;
