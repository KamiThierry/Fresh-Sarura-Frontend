import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface AssignTruckModalProps {
    isOpen: boolean;
    onClose: () => void;
    driver: {
        _id: string;
        firstName: string;
        lastName: string;
        status: string;
        licenseExpiry: string;
    };
    availableVehicles: Array<{ _id: string, plateNumber: string, type: string }>;
    onSuccess: () => void;
}

const AssignTruckModal = ({ isOpen, onClose, driver, availableVehicles, onSuccess }: AssignTruckModalProps) => {
    const [formData, setFormData] = useState({
        driverId: driver._id,
        vehicleId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToastContext();

    const getLicenseStatus = () => {
        if (!driver.licenseExpiry) return { label: 'Unknown', color: 'text-gray-400', isExpired: false };
        const expiry = new Date(driver.licenseExpiry);
        const today = new Date();
        const isExpired = expiry < today;
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (isExpired) return { label: 'Expired', color: 'text-red-600', isExpired: true };
        if (diffDays < 30) return { label: 'Expiring Soon', color: 'text-amber-600', isExpired: false };
        return { label: 'Valid', color: 'text-emerald-600', isExpired: false };
    };

    const licenseStatus = getLicenseStatus();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.patch(`/fleet/drivers/${driver._id}/assign-vehicle`, {
                vehicleId: formData.vehicleId
            });
            showToast('Assignment Successful', `Vehicle has been assigned to ${driver.firstName} ${driver.lastName}.`);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error assigning vehicle:', err);
            const message = err.response?.data?.message || err.message || 'Failed to assign vehicle';
            showToast('Assignment Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedVehicleData = availableVehicles.find(v => v._id === formData.vehicleId);
    const isAlreadyAssigned = !!(selectedVehicleData as any)?.currentDriver;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-indigo-50/50 dark:bg-indigo-900/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/20 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Vehicle</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Link a fleet asset to this driver.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Context Area */}
                <div className="bg-indigo-50/30 dark:bg-indigo-900/5 px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/10">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">Driver</p>
                            <p className="text-gray-900 dark:text-white font-bold">{driver.firstName} {driver.lastName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">License Status</p>
                            <p className={`font-bold text-sm ${licenseStatus.color}`}>
                                {licenseStatus.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">


                    <div className="grid grid-cols-1 gap-6">

                        {/* Assigned Vehicle */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Available Vehicle</label>
                            <div className="relative">
                                <Truck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    required
                                    value={formData.vehicleId}
                                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${isAlreadyAssigned ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-bold`}
                                >
                                    <option value="" disabled>Select a vehicle...</option>
                                    {availableVehicles.map(vehicle => (
                                        <option key={vehicle._id} value={vehicle._id}>
                                            {vehicle.plateNumber} ({vehicle.type}) {(vehicle as any).currentDriver ? '— Currently Assigned' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {isAlreadyAssigned ? (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                                        This vehicle is already assigned to {(selectedVehicleData as any).currentDriver.firstName} {(selectedVehicleData as any).currentDriver.lastName}. A vehicle can only have one driver.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 font-medium">Only showing vehicles currently marked as 'Available'.</p>
                            )}
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
                            disabled={isSubmitting || !formData.vehicleId || isAlreadyAssigned}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all ${isSubmitting || !formData.vehicleId || isAlreadyAssigned ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 hover:scale-105 active:scale-95'}`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AssignTruckModal;
