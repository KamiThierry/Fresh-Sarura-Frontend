import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, CheckCircle2, Scale, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

interface LogPickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    declaration: {
        id: string;
        farm: string;
        crop: string;
        weight: number;
    } | null;
    onSuccess: () => void;
}

const LogPickupModal = ({ isOpen, onClose, declaration, onSuccess }: LogPickupModalProps) => {
    const [weight, setWeight] = useState('');
    const [truckId, setTruckId] = useState('');
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchVehicles();
        }
    }, [isOpen]);

    const fetchVehicles = async () => {
        setLoadingVehicles(true);
        try {
            const res = await api.get('/fleet/vehicles');
            // Filter for vehicles that are available or already on a trip (to allow flexibility)
            // But ideally "Available" is best.
            const available = res.data.filter((v: any) => v.status === 'Available' || v.status === 'On Trip');
            setVehicles(available);
            if (available.length > 0) {
                setTruckId(available[0]._id);
            }
        } catch (err) {
            console.error('Failed to fetch vehicles:', err);
        } finally {
            setLoadingVehicles(false);
        }
    };

    useEffect(() => {
        if (declaration && isOpen) {
            setWeight(declaration.weight.toString());
            setError(null);
        }
    }, [declaration, isOpen]);

    if (!isOpen || !declaration) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const actualWeight = Number(weight);
        const estimatedWeight = declaration.weight;
        const maxAllowed = estimatedWeight * 1.2;

        if (!actualWeight || actualWeight <= 0) {
            setError('Actual weight must be greater than 0 kg.');
            return;
        }

        if (actualWeight > maxAllowed) {
            setError(`Collected weight (${actualWeight} kg) exceeds the estimate (${estimatedWeight} kg) by more than 20%. Please verify the data.`);
            return;
        }

        if (!truckId) {
            setError('Please select a dispatching vehicle.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.patch(`/harvest-declarations/${declaration.id}/pickup`, {
                pickedUpWeightKg: actualWeight,
                truckId,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Pickup logging error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to log pickup. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Pickup</h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mt-0.5">Logistics Hub</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5">
                        
                        {/* Summary Box */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Farm Source</span>
                                <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full uppercase">Ready</span>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">{declaration.farm}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{declaration.crop}</p>
                            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                <Scale size={14} className="text-gray-400" />
                                Estimated: <span className="font-bold">{declaration.weight.toLocaleString()} kg</span>
                            </div>
                        </div>

                        {/* Input Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Actual Weight Collected (kg)
                                </label>
                                <div className="relative">
                                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder-gray-400"
                                        placeholder="e.g. 2150"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Dispatching Vehicle
                                </label>
                                <div className="relative">
                                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={truckId}
                                        onChange={e => setTruckId(e.target.value)}
                                        disabled={loadingVehicles}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                                    >
                                        {loadingVehicles ? (
                                            <option>Loading vehicles...</option>
                                        ) : vehicles.length === 0 ? (
                                            <option>No available vehicles</option>
                                        ) : (
                                            vehicles.map(v => (
                                                <option key={v._id} value={v._id}>
                                                    {v.plateNumber} ({v.currentDriver ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}` : 'No Driver'})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                {(() => {
                                    const selectedVehicle = vehicles.find(v => v._id === truckId);
                                    if (selectedVehicle?.currentDriver?.licenseExpiry) {
                                        const expiry = new Date(selectedVehicle.currentDriver.licenseExpiry);
                                        const isExpired = expiry < new Date();
                                        if (isExpired) {
                                            return (
                                                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-start gap-2 border border-amber-100 dark:border-amber-900/30 animate-pulse">
                                                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold leading-tight">
                                                        WARNING: {selectedVehicle.currentDriver.firstName}'s driver's license has EXPIRED ({expiry.toLocaleDateString()}). 
                                                        Proceed with caution or assign another driver.
                                                    </p>
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>

                        {(() => {
                            const actualWeightNum = Number(weight);
                            const estimatedWeightNum = declaration.weight;
                            const isTooHigh = weight && actualWeightNum > estimatedWeightNum * 1.2;
                            const isTooLow = weight && actualWeightNum <= 0;
                            
                            const displayError = error || (isTooHigh ? `Collected weight exceeds the estimate (${estimatedWeightNum} kg) by more than 20%.` : isTooLow ? 'Weight must be greater than 0 kg.' : null);

                            if (!displayError) return null;

                            return (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{displayError}</p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        {(() => {
                            const actualWeightNum = Number(weight);
                            const estimatedWeightNum = declaration.weight;
                            const isWeightInvalid = !weight || actualWeightNum <= 0 || actualWeightNum > estimatedWeightNum * 1.2;
                            const isDisabled = isSubmitting || isWeightInvalid || !truckId;

                            return (
                                <button
                                    type="submit"
                                    disabled={isDisabled}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all ${
                                        isDisabled
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-blue-900/20'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={18} />
                                    )}
                                    {isSubmitting ? 'Logging...' : 'Confirm Pickup'}
                                </button>
                            );
                        })()}
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default LogPickupModal;
