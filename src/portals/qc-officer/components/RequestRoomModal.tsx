import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, RefreshCw, Layers } from 'lucide-react';
import { api } from '../../../lib/api';

interface RequestRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        intakeLogId: string;
        cropName: string;
        pickedUpWeightKg: number;
    } | null;
    onSuccess: () => void;
}

const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-400';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

const RequestRoomModal = ({ isOpen, onClose, data, onSuccess }: RequestRoomModalProps) => {
    const [receivedWeight, setReceivedWeight] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && data) {
            setReceivedWeight(data.pickedUpWeightKg.toString());
        }
    }, [isOpen, data]);

    if (!isOpen || !data) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await api.post('/processing-batches', {
                intakeLogId: data.intakeLogId,
                receivedWeightKg: parseFloat(receivedWeight),
                cropName: data.cropName
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to request room. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                            <Layers size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Processing Room</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30 mb-4">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">{data.cropName}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Arrival Weight (Declared): {data.pickedUpWeightKg} kg</p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Confirm Received Weight (kg)</label>
                        <input
                            type="number"
                            required
                            step="0.1"
                            value={receivedWeight}
                            onChange={(e) => setReceivedWeight(e.target.value)}
                            className={inputClass}
                            placeholder="0.0"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                            Send Request
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default RequestRoomModal;
