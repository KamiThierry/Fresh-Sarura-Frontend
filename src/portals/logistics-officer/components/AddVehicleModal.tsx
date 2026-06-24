import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Calendar, Save, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface AddVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddVehicleModal = ({ isOpen, onClose, onSuccess }: AddVehicleModalProps) => {
    const [formData, setFormData] = useState({
        plateNumber: '',
        type: 'Refrigerated Truck',
        capacityKg: '',
        status: 'Available',
        nextMaintenanceDate: ''
    });
    const [plateError, setPlateError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToastContext();

    if (!isOpen) return null;

    const minServiceDate = new Date();
    minServiceDate.setFullYear(minServiceDate.getFullYear() + 1);
    const minServiceStr = minServiceDate.toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPlateError(null);

        if (formData.nextMaintenanceDate && formData.nextMaintenanceDate < minServiceStr) {
            showToast('Invalid Date', 'Next service date must be at least 1 year in the future.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/fleet/vehicles', {
                ...formData,
                capacityKg: Number(formData.capacityKg)
            });
            showToast('Vehicle Registered', `Vehicle ${formData.plateNumber} has been added to the fleet.`);
            onSuccess();
            onClose();
            setFormData({
                plateNumber: '',
                type: 'Refrigerated Truck',
                capacityKg: '',
                status: 'Available',
                nextMaintenanceDate: ''
            });
        } catch (err: any) {
            console.error('Error adding vehicle:', err);
            const message = err.response?.data?.message || err.message || 'Failed to add vehicle';
            
            // Check if it's a duplicate plate error
            if (message.toLowerCase().includes('plate') || message.toLowerCase().includes('exists')) {
                setPlateError(message);
            } else {
                showToast('Registration Error', message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register New Vehicle</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add a new asset to the fleet.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Plate Number */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plate Number</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. RAB 123 C"
                                value={formData.plateNumber}
                                onChange={(e) => {
                                    setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() });
                                    setPlateError(null);
                                }}
                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 outline-none transition-all font-mono font-bold ${
                                    plateError 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'
                                }`}
                            />
                            {plateError && (
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 animate-pulse">
                                    <AlertCircle size={14} />
                                    {plateError}
                                </p>
                            )}
                        </div>

                        {/* Vehicle Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Type</label>
                            <div className="relative">
                                <Truck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium"
                                >
                                    <option value="Refrigerated Truck">Refrigerated Truck</option>
                                    <option value="Standard Truck">Standard Truck</option>
                                    <option value="Pickup">Pickup</option>
                                    <option value="Van">Van</option>
                                </select>
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Capacity (kg)</label>
                            <input
                                type="number"
                                required
                                placeholder="e.g. 5000"
                                value={formData.capacityKg}
                                onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                            />
                        </div>

                        {/* Initial Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="Available">Available</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>

                        {/* Next Service Date */}
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Service Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    min={minServiceStr}
                                    value={formData.nextMaintenanceDate}
                                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all accent-indigo-500 font-medium"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isSubmitting ? 'Registering...' : 'Save Vehicle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddVehicleModal;
