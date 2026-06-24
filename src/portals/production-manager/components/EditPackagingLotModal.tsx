import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';

interface EditPackagingLotModalProps {
    lot: any;
    onClose: () => void;
    onSuccess: () => void;
}

const EditPackagingLotModal = ({ lot, onClose, onSuccess }: EditPackagingLotModalProps) => {
    const [form, setForm] = useState({
        vendor: '', pricePerBox: '', quantityReceived: '', receivedDate: '', notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToastContext();

    useEffect(() => {
        if (lot) {
            setForm({
                vendor: lot.vendor || '',
                pricePerBox: lot.pricePerBox?.toString() || '',
                quantityReceived: lot.quantityReceived?.toString() || '',
                receivedDate: lot.receivedDate ? new Date(lot.receivedDate).toISOString().split('T')[0] : '',
                notes: lot.notes || ''
            });
        }
    }, [lot]);

    const handleSubmit = async () => {
        if (!form.vendor || !form.pricePerBox || !form.quantityReceived || !form.receivedDate) {
            showToast('Validation Error', 'All fields except notes are required.');
            return;
        }
        setSubmitting(true);
        try {
            await api.patch(`/packaging/${lot._id}`, {
                vendor: form.vendor,
                pricePerBox: parseFloat(form.pricePerBox),
                quantityReceived: parseInt(form.quantityReceived),
                receivedDate: form.receivedDate,
                notes: form.notes,
            });
            showToast('Success', 'Packaging stock updated successfully.');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast('Error', err?.message || 'Failed to update stock.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <Package2 size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Edit Packaging Stock
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Modify details for {lot.vendor}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Vendor / Brand *</label>
                            <input type="text" value={form.vendor}
                                onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                                placeholder="e.g. PackRight Ltd"
                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Price per Box (Rwf) *</label>
                            <input type="number" value={form.pricePerBox}
                                onChange={e => setForm(p => ({ ...p, pricePerBox: e.target.value }))}
                                placeholder="e.g. 500"
                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Quantity Received *</label>
                            <input type="number" value={form.quantityReceived}
                                onChange={e => setForm(p => ({ ...p, quantityReceived: e.target.value }))}
                                placeholder="e.g. 500"
                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Received Date *</label>
                            <input type="date" value={form.receivedDate}
                                onChange={e => setForm(p => ({ ...p, receivedDate: e.target.value }))}
                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes (optional)</label>
                            <input type="text" value={form.notes}
                                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="e.g. Carton boxes 40x30x20cm"
                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? 'Saving...' : (
                            <>
                                Save Changes <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditPackagingLotModal;
