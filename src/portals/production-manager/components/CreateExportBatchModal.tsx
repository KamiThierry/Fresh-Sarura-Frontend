import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plane, Package, Package2, Plus, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface StockItem {
    _id: string;
    stockId: string;
    cropName: string;
    processedWeightKg: number;
    assignedRoom?: string;
    gradeLabel?: string;
}

interface SelectedLine {
    stockItem: StockItem;
    allocateKg: number | '';
    boxCount: number | '';
    weightPerBoxKg: number | '';
    error?: string;
}

interface CreateExportBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventoryItems: any[];
    onSuccess: () => void;
}

const CreateExportBatchModal = ({ isOpen, onClose, inventoryItems, onSuccess }: CreateExportBatchModalProps) => {
    const [clientName, setClientName] = useState('');
    const [destination, setDestination] = useState('');
    const [targetShipmentDate, setTargetShipmentDate] = useState('');
    const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [isPastDate, setIsPastDate] = useState(false);
    const { showToast } = useToastContext();

    const [packagingLots, setPackagingLots] = useState<any[]>([]);
    const [selectedLotId, setSelectedLotId] = useState<string>('');
    const [packagingLoading, setPackagingLoading] = useState(false);
    const [itemError, setItemError] = useState<{ id: string, message: string } | null>(null);
    const itemErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showItemError = (stockId: string, message: string) => {
        setItemError({ id: stockId, message });
        if (itemErrorTimeoutRef.current) {
            clearTimeout(itemErrorTimeoutRef.current);
        }
        itemErrorTimeoutRef.current = setTimeout(() => {
            setItemError(null);
        }, 4000);
    };

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setClientName('');
            setDestination('');
            setTargetShipmentDate('');
            setSelectedLines([]);
            setSubmitError('');
            setIsPastDate(false);
        }
    }, [isOpen]);

    // Fetch packaging stock when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setPackagingLoading(true);
        setSelectedLotId('');
        api.get('/packaging')
            .then(res => {
                const lots = (res.data || []).filter((l: any) => 
                    l.status === 'active' && l.quantityAvailable > 0
                );
                setPackagingLots(lots);
                // Auto-select if only one lot exists
                if (lots.length === 1) setSelectedLotId(lots[0]._id);
            })
            .catch(() => setPackagingLots([]))
            .finally(() => setPackagingLoading(false));
    }, [isOpen]);

    useEffect(() => {
        if (targetShipmentDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const shipmentDate = new Date(targetShipmentDate);
            shipmentDate.setHours(0, 0, 0, 0);
            setIsPastDate(shipmentDate < today);
        } else {
            setIsPastDate(false);
        }
    }, [targetShipmentDate]);

    if (!isOpen) return null;

    // Only show available stock (not fully allocated)
    const availableStock: StockItem[] = inventoryItems
        .filter((i: any) => i.availableKg > 0)
        .map((i: any) => ({
            _id: i.rawId,
            stockId: i.id,
            cropName: i.produce,
            processedWeightKg: i.availableKg,
            assignedRoom: i.storageLocation,
            gradeLabel: i.grade,
        }));



    const isSelected = (stockId: string) =>
        selectedLines.some(l => l.stockItem.stockId === stockId);

    const handleAddLine = (item: StockItem) => {
        if (packagingLots.length === 0) {
            showItemError(item.stockId, 'Please add packaging stock in the Inventory module first.');
            return;
        }
        if (!selectedLotId) {
            showItemError(item.stockId, 'Please select a packaging vendor lot before adding stock items.');
            return;
        }

        if (isSelected(item.stockId)) return;
        
        setItemError(null);
        setSubmitError('');
        setSelectedLines(prev => [...prev, {
            stockItem: item,
            allocateKg: item.processedWeightKg, // default to full, PM can reduce
            boxCount: '',
            weightPerBoxKg: '',
        }]);
    };

    const handleRemoveLine = (stockId: string) => {
        setSelectedLines(prev => prev.filter(l => l.stockItem.stockId !== stockId));
    };

    const handleLineChange = (stockId: string, field: keyof SelectedLine, value: any) => {
        setSelectedLines(prev => prev.map(l => {
            if (l.stockItem.stockId !== stockId) return l;
            const updated = { ...l, [field]: value };
            
            const allocKg = typeof updated.allocateKg === 'number' ? updated.allocateKg : 0;
            const bCount = typeof updated.boxCount === 'number' ? updated.boxCount : 0;

            // Validate allocateKg
            if (field === 'allocateKg') {
                if (allocKg <= 0) {
                    updated.error = 'Must be greater than 0';
                } else if (allocKg > l.stockItem.processedWeightKg) {
                    updated.error = `Max available: ${l.stockItem.processedWeightKg} kg`;
                } else {
                    updated.error = undefined;
                }
            }
            
            if (allocKg > 0 && bCount > 0) {
                updated.weightPerBoxKg = parseFloat((allocKg / bCount).toFixed(2));
            } else {
                updated.weightPerBoxKg = '';
            }

            return updated;
        }));
    };

    const totalAllocatedKg = selectedLines.reduce((sum, l) => sum + (l.allocateKg || 0), 0);
    const hasErrors = selectedLines.some(l => l.error);

    // Derived packaging calculations
    const selectedLot = packagingLots.find(l => l._id === selectedLotId) ?? null;
    const totalBoxesRequested = selectedLines.reduce((sum, l) => sum + (typeof l.boxCount === 'number' ? l.boxCount : 0), 0);
    const packagingCost = selectedLot ? totalBoxesRequested * selectedLot.pricePerBox : 0;
    const boxesAfterBatch = selectedLot ? selectedLot.quantityAvailable - totalBoxesRequested : null;
    const insufficientBoxes = boxesAfterBatch !== null && boxesAfterBatch < 0;

    const canSubmit = clientName && destination && targetShipmentDate && 
        selectedLines.length > 0 && !hasErrors && !isSubmitting && 
        !isPastDate && !insufficientBoxes &&
        selectedLines.every(l => typeof l.boxCount === 'number' && l.boxCount > 0) &&
        !!selectedLotId;

    const handleSubmit = async () => {
        if (!canSubmit || isPastDate) return;
        setIsSubmitting(true);
        setSubmitError('');
        try {
            // One POST per selected stock line
            await Promise.all(selectedLines.map(line =>
                api.post('/export-batches', {
                    processingBatchId: line.stockItem._id,
                    cycleId: undefined, // backend can get from processingBatch if needed
                    cropName: line.stockItem.cropName,
                    clientName,
                    destination,
                    gradeLabel: line.stockItem.gradeLabel || '—',
                    allocatedWeightKg: line.allocateKg,
                    boxCount: line.boxCount,
                    weightPerBoxKg: line.weightPerBoxKg,
                    targetShipmentDate,
                })
            ));

            // Consume packaging stock after batches are created
            if (totalBoxesRequested > 0 && selectedLotId) {
                await api.patch('/packaging/consume', {
                    boxesNeeded: totalBoxesRequested,
                    lotId: selectedLotId,
                    exportBatchRef: `${clientName} — ${destination}`,
                });
            }

            showToast("Export Batch Created", `Successfully created ${selectedLines.length} export batch${selectedLines.length !== 1 ? 'es' : ''}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err?.code === 'INSUFFICIENT_BOXES' || err?.response?.data?.code === 'INSUFFICIENT_BOXES') {
                const avail = err?.available || err?.response?.data?.available || 0;
                setSubmitError(`Not enough boxes in stock. Available: ${avail}. Reduce box count to proceed.`);
            } else {
                setSubmitError(err?.message || err?.response?.data?.message || 'Failed to create export batch. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Plane className="text-purple-600" size={20} />
                            Create Export Batch
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Allocate stock for shipment — select one or more stock items
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Client + Destination */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Client / Buyer *
                            </label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="e.g. Carrefour UAE"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Destination *
                            </label>
                            <input
                                type="text"
                                required
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                placeholder="e.g. Dubai (DXB)"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Date + Grade */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Target Shipment Date *
                            </label>
                            <input
                                type="date"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                value={targetShipmentDate}
                                onChange={e => setTargetShipmentDate(e.target.value)}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                                    isPastDate
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500'
                                }`}
                            />
                            {isPastDate && (
                                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-bold animate-pulse">
                                    <AlertCircle size={12} />
                                    Shipment date cannot be in the past!
                                </p>
                            )}
                        </div>
                        <div>
                            {/* Grade inherits from selected stock items automatically */}
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-700" />

                    {/* Packaging Stock Summary */}
                    {packagingLots.length > 0 && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                    Packaging Vendor (Box Source) *
                                </label>
                                {packagingLoading ? (
                                    <p className="text-xs text-gray-400">Loading packaging stock...</p>
                                ) : (
                                    <select
                                        value={selectedLotId}
                                        onChange={e => setSelectedLotId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    >
                                        <option value="">Select vendor lot...</option>
                                        {packagingLots.map((lot: any) => (
                                            <option key={lot._id} value={lot._id}>
                                                {lot.vendor} — {lot.quantityAvailable.toLocaleString()} boxes available @ {lot.pricePerBox.toLocaleString()} Rwf/box
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Packaging summary — only shown when lot selected and boxes requested */}
                            {selectedLot && totalBoxesRequested > 0 && (
                                <div className={`rounded-xl border p-4 ${
                                    insufficientBoxes
                                        ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40'
                                        : 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800/40'
                                }`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package2 size={15} className={insufficientBoxes ? 'text-red-500' : 'text-purple-600'} />
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                            Packaging Summary — {selectedLot.vendor}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Boxes requested</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                                    {totalBoxesRequested.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Price per box</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                                    {selectedLot.pricePerBox.toLocaleString()} Rwf
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-t border-purple-200 dark:border-purple-800 pt-2">
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">Total packaging cost</span>
                                                <span className="font-bold text-purple-700 dark:text-purple-300">
                                                    {packagingCost.toLocaleString()} Rwf
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">In stock ({selectedLot.vendor})</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                                    {selectedLot.quantityAvailable.toLocaleString()} boxes
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">After this batch</span>
                                                <span className={`font-bold ${insufficientBoxes ? 'text-red-600' : 'text-green-600'}`}>
                                                    {boxesAfterBatch !== null ? boxesAfterBatch.toLocaleString() : '—'} boxes
                                                </span>
                                            </div>
                                            {insufficientBoxes && (
                                                <p className="text-xs text-red-600 font-medium flex items-center gap-1 pt-1">
                                                    <AlertCircle size={11} />
                                                    {selectedLot.vendor} only has {selectedLot.quantityAvailable.toLocaleString()} boxes.
                                                    {packagingLots.length > 1 ? ' Switch vendor or restock.' : ' Restock before proceeding.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedLot && totalBoxesRequested === 0 && (
                                <p className="text-xs text-gray-400">
                                    Select stock items and enter box counts above to see packaging cost.
                                </p>
                            )}
                        </div>
                    )}

                    {/* No packaging stock at all */}
                    {!packagingLoading && packagingLots.length === 0 && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl">
                            <span className="relative flex h-2.5 w-2.5 mt-0.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                    No packaging stock available
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                                    Export batches cannot be created until boxes are restocked. 
                                    Go to Inventory → Packaging to add stock.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stock selector */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package size={16} className="text-gray-500" />
                                Select Stock Items *
                            </label>
                            {totalAllocatedKg > 0 && (
                                <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded font-medium">
                                    Total: {totalAllocatedKg.toLocaleString()} kg across {selectedLines.length} item{selectedLines.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Available stock list */}
                        <div className="space-y-2 mb-4">
                            {availableStock.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-6">No available stock items found.</p>
                            )}
                            {availableStock.map(item => {
                                const selected = isSelected(item.stockId);
                                return (
                                    <div
                                        key={item.stockId}
                                        className={`p-3 rounded-lg border transition-all ${
                                            selected
                                                ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                                    {item.stockId}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {item.cropName} · {item.gradeLabel} · {item.assignedRoom || 'No room'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                                    {item.processedWeightKg.toLocaleString()} kg
                                                </span>
                                                {!selected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddLine(item)}
                                                        className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-500 hover:text-purple-600 transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLine(item.stockId)}
                                                        className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded allocation inputs when selected */}
                                        {selected && (() => {
                                            const line = selectedLines.find(l => l.stockItem.stockId === item.stockId)!;
                                            return (
                                                <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-800/30 grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                                                            Allocate (kg) *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={item.processedWeightKg}
                                                            value={line.allocateKg}
                                                            onChange={e => handleLineChange(item.stockId, 'allocateKg', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                            className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 ${
                                                                line.error
                                                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                                                                    : 'border-gray-200 dark:border-gray-700 bg-white'
                                                            }`}
                                                        />
                                                        {line.error && (
                                                            <p className="text-[11px] text-red-500 mt-0.5 flex items-center gap-1">
                                                                <AlertCircle size={10} />
                                                                {line.error}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            Max: {item.processedWeightKg} kg
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                                                            Box Count *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={line.boxCount}
                                                            onChange={e => handleLineChange(item.stockId, 'boxCount', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                                                            Kg / Box
                                                        </label>
                                                        <input
                                                            type="number"
                                                            readOnly
                                                            value={line.weightPerBoxKg}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500"
                                                        />
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Auto-calculated</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {itemError?.id === item.stockId && (
                                            <div className="mt-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                <AlertCircle size={14} className="flex-shrink-0" />
                                                {itemError.message}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit error */}
                    {submitError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg text-sm text-red-600 dark:text-red-400">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            {submitError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating {selectedLines.length} batch{selectedLines.length !== 1 ? 'es' : ''}...
                            </>
                        ) : (
                            <>
                                Create {selectedLines.length > 1 ? `${selectedLines.length} Batches` : 'Batch'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateExportBatchModal;
