import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, Truck, CheckCircle2 } from 'lucide-react';

interface HarvestReadyModalProps {
    isOpen: boolean;
    onClose: () => void;
    cycles: any[];
    /** Called with the declaration payload on confirm */
    onSubmitConfirm?: (data: {
        cycleId: string;
        estimatedWeightKg: number;
        cropName: string;
        notes?: string;
    }) => Promise<void>;
}

const HarvestReadyModal = ({ isOpen, onClose, cycles, onSubmitConfirm }: HarvestReadyModalProps) => {
    const [selectedCycleId, setSelectedCycleId] = useState('');
    const [volume, setVolume] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default to first cycle if available
    if (isOpen && cycles.length > 0 && !selectedCycleId) {
        setSelectedCycleId(cycles[0]._id);
    }

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cycle = cycles.find(c => c._id === selectedCycleId);
        if (!cycle || !onSubmitConfirm) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmitConfirm({
                cycleId: cycle._id,
                estimatedWeightKg: Number(volume),
                cropName: cycle.crop_name,
                notes,
            });

            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setVolume('');
                setNotes('');
                onClose();
            }, 1800);
        } catch (err: any) {
            console.error('Failed to declare harvest:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal card */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-green-50/60 dark:bg-green-900/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                            <Truck size={18} />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Declare Harvest Ready</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Success state */}
                {submitted ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">Request Sent!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Harvest request sent to Logistics.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-5 space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
                                    <CheckCircle2 size={14} className="rotate-180 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Crop Cycle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Crop Cycle
                                </label>
                                <select
                                    value={selectedCycleId}
                                    onChange={e => setSelectedCycleId(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition-all font-medium"
                                >
                                    {!selectedCycleId && <option value="">Select Cycle...</option>}
                                    {cycles.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.crop_name} — {c.block_name || c.season}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Volume */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Estimated Volume (kg)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 450"
                                    value={volume}
                                    onChange={e => setVolume(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition-all placeholder-gray-400"
                                />
                            </div>

                            {/* Quality notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Quality Notes <span className="font-normal text-gray-400 lowercase">(optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Excellent size, ready for immediate export"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 transition-all placeholder-gray-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedCycleId || !volume}
                                className={`px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${
                                    isSubmitting || !selectedCycleId || !volume
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white active:scale-[0.98]'
                                }`}
                            >
                                <Truck size={15} />
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default HarvestReadyModal;
