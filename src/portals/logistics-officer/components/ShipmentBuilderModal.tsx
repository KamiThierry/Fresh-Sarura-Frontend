import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, User, Plane, Hash, Check, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';

interface ShipmentBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ── Main Modal ──
const ShipmentBuilderModal = ({ isOpen, onClose, onSuccess }: ShipmentBuilderModalProps) => {
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Real export batches
    const [readyBatches, setReadyBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    // Form state
    const [flightNo, setFlightNo] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [flightHours, setFlightHours] = useState<number>(8);
    const [awbNumber, setAwbNumber] = useState('');
    const [invNumber, setInvNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [pallets, setPallets] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Selection
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setSubmitted(false); setError(null);
            setFlightNo('');
            setDepartureDate(''); setDepartureTime('');
            setAwbNumber(''); setInvNumber(''); setNotes('');
            setPallets(0); setSelectedBatchIds([]);
            fetchReadyBatches();
        }
    }, [isOpen]);

    const fetchReadyBatches = async () => {
        setLoadingBatches(true);
        try {
            const res = await api.get('/export-batches?status=ReadyForExport');
            const data = res.data?.data || res.data || [];
            setReadyBatches(data);
        } catch (err) {
            console.error('Failed to fetch ready batches:', err);
        } finally {
            setLoadingBatches(false);
        }
    };

    const toggleBatch = (id: string) => {
        setSelectedBatchIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredBatches = readyBatches.filter(b =>
        b.cropName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.batchId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedBatches = readyBatches.filter(b => selectedBatchIds.includes(b._id));
    const totalBoxes = selectedBatches.reduce((sum, b) => sum + (b.boxCount || 0), 0);
    const totalWeightKg = selectedBatches.reduce((sum, b) => sum + (b.allocatedWeightKg || 0), 0) + (pallets * 15);

    // 1. Group batches by "clientName — destination"
    const groupedBatches = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredBatches.forEach(b => {
            const key = `${b.clientName} — ${b.destination}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });
        return groups;
    }, [filteredBatches]);

    // Derived client and destination from selected batches
    const derivedClient = useMemo(() => {
        if (selectedBatches.length === 0) return '';
        const clients = [...new Set(selectedBatches.map(b => b.clientName).filter(Boolean))];
        return clients.length === 1 ? clients[0] : 'Multiple Clients';
    }, [selectedBatches]);

    const derivedDestination = useMemo(() => {
        if (selectedBatches.length === 0) return '';
        const destinations = [...new Set(selectedBatches.map(b => b.destination).filter(Boolean))];
        return destinations.length === 1 ? destinations[0] : 'Multiple Destinations';
    }, [selectedBatches]);

    const isFormInvalid = useMemo(() => {
        if (selectedBatchIds.length === 0) return true;
        if (!flightNo || !departureDate || !departureTime || !derivedDestination || !awbNumber || !invNumber) return true;
        
        // Past date check
        const depDate = new Date(departureDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (depDate < today) return true;

        // Flight hours range
        if (flightHours < 1 || flightHours > 24) return true;

        // Total weight
        if (totalWeightKg <= 0) return true;

        return false;
    }, [selectedBatchIds, flightNo, departureDate, departureTime, derivedDestination, flightHours, totalWeightKg, awbNumber, invNumber]);

    const handleSubmit = async () => {
        if (selectedBatchIds.length === 0) { setError('Select at least one export batch.'); return; }
        if (!flightNo || !departureDate || !departureTime || !derivedDestination || !awbNumber || !invNumber) { 
            setError('All fields (Flight No, Date, Time, AWB, and Invoice) are required.'); 
            return; 
        }

        const depDate = new Date(departureDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (depDate < today) {
            setError('Departure date cannot be in the past.');
            return;
        }

        if (flightHours < 1 || flightHours > 24) {
            setError('Estimated flight hours must be between 1 and 24.');
            return;
        }

        if (totalWeightKg <= 0) {
            setError('Total shipment weight must be greater than 0 kg.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await api.post('/shipments', {
                flightNumber: flightNo,
                destination: derivedDestination,
                clientName: derivedClient,
                departureDate,
                departureTime,
                estimatedFlightHours: flightHours,
                awbNumber,
                invoiceNumber: invNumber,
                exportBatchIds: selectedBatchIds,
                totalBoxes,
                totalWeightKg,
                skids: pallets,
                notes,
            });
            setSubmitted(true);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to generate packing list.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/40 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col min-h-[85vh] max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Packing List</h2>
                    <div className="flex items-center gap-3">
                        {!submitted && (
                            <div className="hidden md:flex items-center gap-6 mr-6 text-sm">
                                <div className="flex flex-col items-end">
                                    <span className="text-gray-500">Ready Batches</span>
                                    <span className="font-bold text-gray-900 dark:text-white text-lg leading-none">{readyBatches.length}</span>
                                </div>
                                <div className="flex flex-col items-end border-l pl-6 border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500">Selected</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg leading-none">{selectedBatchIds.length}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Success State */}
                {submitted ? (
                    <div className="flex flex-col flex-1">
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">Packing List Generated!</p>
                            <p className="text-sm text-gray-500">The shipment has been scheduled and the PM has been notified.</p>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end">
                            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors shadow-sm">
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Body — Split View */}
                        <div className="flex flex-1 overflow-hidden">

                            {/* LEFT: Export Batches */}
                            <div className="w-7/12 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="Search batches..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2 px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-800/50">
                                    <div className="col-span-1" />
                                    <div className="col-span-4">Batch / Crop</div>
                                    <div className="col-span-3">Client</div>
                                    <div className="col-span-2 text-center">Boxes</div>
                                    <div className="col-span-2 text-right">Weight</div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {loadingBatches ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                                        </div>
                                    ) : filteredBatches.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-gray-400 font-medium">No batches ready for export.</p>
                                            <p className="text-xs text-gray-400 mt-1">Ask the PM to mark export batches as "Ready for Export" first.</p>
                                        </div>
                                    ) : (
                                        Object.entries(groupedBatches).map(([groupKey, batches]) => (
                                            <div key={groupKey} className="mb-4 last:mb-0">
                                                {/* Group header */}
                                                <div className="px-4 py-2 flex items-center justify-between bg-gray-100/50 dark:bg-gray-800/30 rounded-t-lg border-b border-gray-200/50 dark:border-gray-700/50">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        {groupKey}
                                                    </span>
                                                    {/* Select all in group button */}
                                                    <button
                                                        onClick={() => {
                                                            const allSelected = batches.every(b => selectedBatchIds.includes(b._id));
                                                            if (allSelected) {
                                                                setSelectedBatchIds(prev => prev.filter(id => !batches.find(b => b._id === id)));
                                                            } else {
                                                                setSelectedBatchIds(prev => [...new Set([...prev, ...batches.map(b => b._id)])]);
                                                            }
                                                        }}
                                                        className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                                                    >
                                                        {batches.every(b => selectedBatchIds.includes(b._id)) ? 'Deselect all' : 'Select all'}
                                                    </button>
                                                </div>

                                                <div className="space-y-1 mt-1">
                                                    {batches.map(batch => {
                                                        const isSelected = selectedBatchIds.includes(batch._id);
                                                        return (
                                                            <div
                                                                key={batch._id}
                                                                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-sm' : 'hover:bg-white dark:hover:bg-gray-800'}`}
                                                                onClick={() => toggleBatch(batch._id)}
                                                            >
                                                                <div className="col-span-1 flex justify-center">
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                                                                        {isSelected && <Check size={12} className="text-white" />}
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-4">
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{batch.cropName}</p>
                                                                    <p className="text-xs text-gray-500 font-mono">{batch.batchId}</p>
                                                                </div>
                                                                <div className="col-span-3 text-xs text-gray-600 dark:text-gray-400">{batch.clientName}</div>
                                                                <div className="col-span-2 text-center">
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{batch.boxCount}</span>
                                                                </div>
                                                                <div className="col-span-2 text-right">
                                                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                                        {batch.allocatedWeightKg?.toLocaleString()} kg
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Shipment Details */}
                            <div className="w-5/12 p-6 flex flex-col bg-white dark:bg-gray-900 overflow-y-auto">
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Plane size={16} className="text-indigo-600" /> Shipment Details
                                    </h3>

                                    {/* Client / Consignee — auto from selected batches */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500">Client / Consignee</label>
                                        <div className={`w-full px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
                                            derivedClient
                                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium'
                                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 italic'
                                        }`}>
                                            <User size={14} className="text-gray-400 flex-shrink-0" />
                                            {derivedClient || 'Auto-filled from selected batches'}
                                        </div>
                                        {derivedClient === 'Multiple Clients' && (
                                            <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                                <AlertCircle size={11} />
                                                Batches belong to different clients — confirm this is intentional
                                            </p>
                                        )}
                                    </div>

                                    {/* Destination — auto from selected batches */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500">Destination *</label>
                                        <div className={`w-full px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
                                            derivedDestination
                                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium'
                                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 italic'
                                        }`}>
                                            {derivedDestination || 'Auto-filled from selected batches'}
                                        </div>
                                        {derivedDestination === 'Multiple Destinations' && (
                                            <p className="text-[11px] text-red-500 flex items-center gap-1">
                                                <AlertCircle size={11} />
                                                Warning: batches have different destinations
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-500">Departure Date *</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                                <input type="date" className="w-full pl-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Dep. Time</label>
                                            <input type="time" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-500">Flight No *</label>
                                            <input type="text" placeholder="WB300" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={flightNo} onChange={e => setFlightNo(e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Estimated Flight Duration */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500">
                                            Est. Flight Duration (hrs)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={24}
                                            value={flightHours}
                                            onChange={e => setFlightHours(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g. 8"
                                        />
                                        <p className="text-[11px] text-gray-400">
                                            Used to prompt cargo confirmation after arrival
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-500">AWB Number *</label>
                                            <input type="text" placeholder="123-4567-890" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={awbNumber} onChange={e => setAwbNumber(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-500">Invoice # *</label>
                                            <div className="relative">
                                                <Hash size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                                <input type="text" className="w-full pl-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" value={invNumber} onChange={e => setInvNumber(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500">Notes</label>
                                        <textarea className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none" rows={3} placeholder="Special instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
                                    </div>

                                    {(() => {
                                        const depDate = departureDate ? new Date(departureDate) : null;
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        
                                        const isPastDate = depDate && depDate < today;
                                        const isInvalidDuration = flightHours < 1 || flightHours > 24;
                                        const isMissingFields = !flightNo || !departureDate || !departureTime || !awbNumber || !invNumber;

                                        const displayError = error || (
                                            isPastDate ? 'Departure date cannot be in the past.' :
                                            isInvalidDuration ? 'Flight duration must be between 1 and 24 hours.' :
                                            (selectedBatchIds.length > 0 && isMissingFields) ? 'Please complete all details (Flight No, Date, Time, AWB, and Invoice).' :
                                            null
                                        );

                                        if (!displayError) return null;

                                        return (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{displayError}</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between items-center z-10 flex-shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Boxes</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{totalBoxes}</span>
                                </div>
                                {/* <div className="text-right">
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Skids / Pallets</span>
                                    <input type="number" min="0" className="w-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-center font-bold focus:ring-2 focus:ring-indigo-500" placeholder="0" value={pallets || ''} onChange={e => setPallets(parseInt(e.target.value) || 0)} />
                                </div> */}
                                <div className="text-right pl-6 border-l border-gray-200 dark:border-gray-700">
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Gross Weight</span>
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalWeightKg.toLocaleString()} kg</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium text-sm transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || isFormInvalid}
                                    className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                                        isSubmitting || isFormInvalid
                                            ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/10'
                                    }`}
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {isSubmitting ? 'Generating...' : 'Generate Packing List'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ShipmentBuilderModal;
