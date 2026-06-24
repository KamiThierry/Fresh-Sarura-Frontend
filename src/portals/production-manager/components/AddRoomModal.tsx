import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, DoorOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddRoomModal = ({ isOpen, onClose, onSuccess }: AddRoomModalProps) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'Processing' | 'Cold Room'>('Processing');
    const [capacityKg, setCapacityKg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToastContext();

    const reset = () => { setName(''); setType('Processing'); setCapacityKg(''); setError(null); };

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post('/rooms', { name, type, capacityKg: Number(capacityKg) });
            showToast('Room Created', `${name} has been added to the system.`);
            reset();
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to add room.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
                            <DoorOpen size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Room</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                Room Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Cold Bay A, Processing Room 3"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                Room Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['Processing', 'Cold Room'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                                            type === t
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                Capacity (kg) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={capacityKg}
                                onChange={e => setCapacityKg(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-400"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name || !capacityKg}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all ${
                                isSubmitting || !name || !capacityKg
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                            }`}
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {isSubmitting ? 'Adding...' : 'Add Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddRoomModal;
