import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, ArrowRight } from 'lucide-react';

interface AddFacilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddFacilityModal = ({ isOpen, onClose }: AddFacilityModalProps) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        district: '',
        capacity: '',
        status: 'Active'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const facilityTypes = ['Processing Hub', 'Consolidation', 'Export Hub', 'Collection Center', 'Other'];
    const districts = ['Gasabo', 'Kicukiro', 'Nyarugenge', 'Kirehe', 'Musanze', 'Rubavu', 'Other'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            onClose();
        }, 1000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MapPin className="text-green-600 dark:text-green-400" size={20} />
                            Add Facility
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Register a new physical location</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="add-facility-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Facility Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="E.g. Kigali Central Packhouse"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm dark:text-white dark:placeholder-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Facility Type *
                            </label>
                            <select
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm dark:text-white"
                            >
                                <option value="">Select facility type</option>
                                {facilityTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    District *
                                </label>
                                <select
                                    required
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm dark:text-white"
                                >
                                    <option value="">Select district</option>
                                    {districts.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Capacity / Role *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                    placeholder="E.g. 50 Tons/Day or Logistics"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm dark:text-white dark:placeholder-gray-500"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-facility-form"
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Location'}
                        {!isSubmitting && <ArrowRight size={18} />}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddFacilityModal;
