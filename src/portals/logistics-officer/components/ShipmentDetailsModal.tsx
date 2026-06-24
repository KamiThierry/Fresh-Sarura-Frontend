import { X, FileText, Upload, Eye, CheckCircle, AlertTriangle, Clock, 
         Plane, Package, Calendar, Loader2, XCircle, Trash2 } from 'lucide-react';
import { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';

interface ShipmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: any;
    onStatusChange?: () => void;
}

// Status config — one source of truth
const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    PackingListGenerated: { label: 'Scheduled',   color: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500' },
    Departed:             { label: 'In Transit',  color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 animate-pulse' },
    Shipped:              { label: 'Shipped',      color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
    Cancelled:            { label: 'Cancelled',   color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' },
    Draft:                { label: 'Draft',        color: 'text-gray-500',                      dot: 'bg-gray-400' },
};

const REQUIRED_DOC_TYPES = [
    { label: 'Packing List',              key: 'PackingList' },
    { label: 'Commercial Invoice',        key: 'CommercialInvoice' },
    { label: 'Phytosanitary Certificate', key: 'PhytosanitaryCert' },
    { label: 'Airway Bill (AWB)',          key: 'AWB' },
];

const ShipmentDetailsModal = ({ isOpen, onClose, shipment, onStatusChange }: ShipmentDetailsModalProps) => {
    const navigate = useNavigate();
    const [isActioning, setIsActioning] = useState(false);
    const [realDocs, setRealDocs] = useState<any[]>([]);
    const [eventLogs, setEventLogs] = useState<any[]>([]);
    const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingDocKeyRef = useRef<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deleteDocTarget, setDeleteDocTarget] = useState<{ id: string; name: string } | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (isOpen && shipment?._id) {
            setShowCancelConfirm(false);
            setCancelReason('');

            // Fetch real documents
            api.get(`/export-documents?shipmentId=${shipment._id}`)
                .then(res => setRealDocs(res.data?.data || res.data || []))
                .catch(console.error);

            // Fetch real event logs for this shipment
            api.get(`/event-logs?module=Export & Shipments`)
                .then(res => {
                    const all = res.data?.data || res.data || [];
                    // Filter to logs mentioning this shipment's plNumber or _id
                    const filtered = all.filter((log: any) =>
                        log.metadata?.shipmentId === shipment._id ||
                        log.description?.includes(shipment.plNumber)
                    );
                    setEventLogs(filtered.slice(0, 6)); // max 6 entries
                })
                .catch(console.error);
        }
    }, [isOpen, shipment]);

    // Departure overdue — flight time has passed but still Scheduled
    const isDepartureOverdue = useMemo(() => {
        if (!shipment) return false;
        if (!shipment.departureDate) return false;
        if (shipment.status !== 'PackingListGenerated') return false;
        const depDateTime = new Date(shipment.departureDate);
        if (shipment.departureTime) {
            const [h, m] = shipment.departureTime.split(':').map(Number);
            depDateTime.setHours(h, m, 0, 0);
        }
        return depDateTime < new Date();
    }, [shipment]);

    // Arrival overdue — departure + flight hours has passed but still In Transit
    const isArrivalOverdue = useMemo(() => {
        if (!shipment) return false;
        if (shipment.status !== 'Departed') return false;
        if (!shipment.departedAt) return false;
        const arrivalTime = new Date(shipment.departedAt);
        arrivalTime.setHours(
            arrivalTime.getHours() + (shipment.estimatedFlightHours || 8)
        );
        return arrivalTime < new Date();
    }, [shipment]);

    // Dispatch Validation Logic
    const dispatchValidation = useMemo(() => {
        if (!shipment) return { isValid: false, errors: [] };
        const errors: string[] = [];
        
        // 1. Documents check — must have at least one (Packing List or AWB)
        if (realDocs.length === 0) {
            errors.push("Missing required documents (Packing List or AWB)");
        }
        
        // 2. Date check — must be today or in the past
        if (shipment.departureDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const depDate = new Date(shipment.departureDate);
            depDate.setHours(0, 0, 0, 0);
            if (depDate > today) {
                errors.push("Cannot dispatch future flight");
            }
        }
        
        // 3. Status check — must be Scheduled (PackingListGenerated)
        if (shipment.status !== 'PackingListGenerated') {
            errors.push("Invalid status for dispatch");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, [shipment, realDocs]);

    const cfg = (shipment && statusConfig[shipment.status]) || statusConfig.Draft;

    if (!isOpen || !shipment) return null;

    const handleDepart = async () => {
        if (!dispatchValidation.isValid) return;
        setIsActioning(true);
        try {
            await api.patch(`/shipments/${shipment._id}/depart`, {});
            onStatusChange?.();
            onClose();
        } catch (err) { console.error(err); }
        finally { setIsActioning(false); }
    };

    const handleShip = async () => {
        setIsActioning(true);
        try {
            await api.patch(`/shipments/${shipment._id}/ship`, {});
            onStatusChange?.();
            onClose();
        } catch (err) { console.error(err); }
        finally { setIsActioning(false); }
    };

    const handleCancel = async () => {
        if (!showCancelConfirm) { setShowCancelConfirm(true); return; }
        setIsActioning(true);
        try {
            await api.patch(`/shipments/${shipment._id}/cancel`, { reason: cancelReason });
            onStatusChange?.();
            onClose();
        } catch (err) { console.error(err); }
        finally { setIsActioning(false); }
    };

    const handleRealUpload = (docKey: string) => {
        setUploadError(null);
        pendingDocKeyRef.current = docKey;
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const docKey = pendingDocKeyRef.current;
        if (!file || !docKey) return;
        
        setUploadingDocKey(docKey);
        setUploadError(null);

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await api.post('/export-documents', {
                    shipmentId: shipment._id,
                    docType: docKey,
                    fileName: file.name,
                    fileUrl: reader.result as string,
                });
                const res = await api.get(`/export-documents?shipmentId=${shipment._id}`);
                setRealDocs(res.data?.data || res.data || []);
            } catch (err: any) { 
                console.error('Upload failed:', err); 
                setUploadError(err.response?.data?.message || err.message || 'Upload failed');
            }
            finally { 
                setUploadingDocKey(null); 
                pendingDocKeyRef.current = null;
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteDocument = async () => {
        if (!deleteDocTarget) return;
        setIsActioning(true);
        try {
            await api.delete(`/export-documents/${deleteDocTarget.id}`);
            const res = await api.get(`/export-documents?shipmentId=${shipment._id}`);
            setRealDocs(res.data?.data || res.data || []);
            setDeleteDocTarget(null);
        } catch (err) { console.error('Delete failed:', err); }
        finally { setIsActioning(false); }
    };

    const logIconMap: Record<string, any> = {
        'Flight Departed':       <Plane size={14} />,
        'Shipment Shipped':      <CheckCircle size={14} />,
        'Document Uploaded':     <Upload size={14} />,
        'Shipment Created':      <Clock size={14} />,
        'Shipment Cancelled':    <XCircle size={14} />,
    };

    const formatLogTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 0) return `Today, ${timeStr}`;
        if (diffDays === 1) return `Yesterday, ${timeStr}`;
        return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${timeStr}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shipment Details</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-mono font-medium">
                                AWB: {shipment.awbNumber || '—'}
                            </span>
                            {/* Overdue alert */}
                            {isDepartureOverdue && (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/30">
                                    <AlertTriangle size={11} />
                                    Departure overdue — confirm flight status
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-medium text-gray-900 dark:text-white">{shipment.plNumber}</span>
                            <span>•</span>
                            <span>{shipment.clientName || '—'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Real status */}
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
                            <div className={`flex items-center gap-1.5 font-bold text-sm ${cfg.color}`}>
                                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">

                    {/* Trip Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Route */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">
                                <Plane size={14} /> Route Info
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">KGL</div>
                                    <div className="text-xs text-gray-400">Kigali</div>
                                </div>
                                <div className="flex-1 flex flex-col items-center px-3">
                                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                                        {shipment.flightNumber || '—'}
                                    </span>
                                    <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700 relative">
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1">Direct</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {shipment.destination?.slice(0, 3).toUpperCase() || '—'}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate max-w-[80px]">{shipment.destination || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">
                                <Calendar size={14} /> Schedule
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Departure</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {shipment.departureDate
                                            ? new Date(shipment.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Time</span>
                                    <span className={`font-bold ${isDepartureOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {shipment.departureTime || '—'}
                                        {isDepartureOverdue && ' ⚠'}
                                    </span>
                                </div>
                                {shipment.departedAt && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Departed</span>
                                        <span className="font-bold text-amber-600 dark:text-amber-400">
                                            {new Date(shipment.departedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cargo */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs font-semibold uppercase tracking-wide">
                                <Package size={14} /> Cargo Check
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div>
                                    <span className="block text-2xl font-bold text-gray-900 dark:text-white">{shipment.totalBoxes || 0}</span>
                                    <span className="text-xs text-gray-500">Total Boxes</span>
                                </div>
                                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                                <div>
                                    <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                                        {shipment.totalWeightKg || 0}
                                        <small className="text-sm font-normal text-gray-400 ml-1">kg</small>
                                    </span>
                                    <span className="text-xs text-gray-500">Gross Weight</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cancellation reason (if cancelled) */}
                    {shipment.status === 'Cancelled' && shipment.cancellationReason && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-3">
                            <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-700 dark:text-red-400">Shipment Cancelled</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{shipment.cancellationReason}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* Documents */}
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-indigo-600" />
                                Required Export Documents
                            </h3>
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelected} />
                                {uploadError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        {uploadError}
                                    </div>
                                )}
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {REQUIRED_DOC_TYPES.map(({ label, key }) => {
                                        const uploaded = realDocs.find(d => d.docType === key);
                                        const isUploading = uploadingDocKey === key;
                                        return (
                                            <div key={key} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                        uploaded
                                                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                                    }`}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{label}</p>
                                                        {uploaded ? (
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                                                <CheckCircle size={10} /> {uploaded.fileName}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                                                <AlertTriangle size={10} /> Required
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {uploaded ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => window.open(uploaded.fileUrl)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="View Document"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteDocTarget({ id: uploaded._id, name: uploaded.fileName })}
                                                            disabled={isActioning || shipment.status === 'Cancelled'}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                                                            title="Delete Document"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRealUpload(key)}
                                                        disabled={isUploading || shipment.status === 'Cancelled'}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-40"
                                                    >
                                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                        Upload PDF
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Shipment Log — real data */}
                        <div className="w-full lg:w-96">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-gray-400" />
                                Shipment Log
                            </h3>
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                                {eventLogs.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No log entries yet.</p>
                                ) : (
                                    <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                                        {eventLogs.map((log: any, i: number) => (
                                            <div key={i} className="relative pl-6">
                                                <div className="absolute -left-[13px] top-0 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 z-10">
                                                    {logIconMap[log.action] || <Clock size={14} />}
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">
                                                    {formatLogTime(log.timestamp)}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {log.description}
                                                </span>
                                                {log.actor && (
                                                    <span className="text-xs text-gray-400 block mt-0.5">by {log.actor}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cancel confirm panel */}
                    {showCancelConfirm && (
                        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                            <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">
                                Cancelling this shipment will return all export batches to "Ready for Export". This cannot be undone.
                            </p>
                            <textarea
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Reason for cancellation (e.g. Flight cancelled by airline)..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 mb-2 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Keep Shipment
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isActioning || !cancelReason.trim()}
                                    className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isActioning ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    Confirm Cancellation
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                        {/* Cancel — only for non-terminal statuses */}
                        {!['Shipped', 'Cancelled'].includes(shipment.status) && !showCancelConfirm && (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Cancel Shipment
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { onClose(); navigate(`/logistics/documents?shipmentId=${shipment._id}`); }}
                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
                        >
                            Manage Documents
                        </button>

                        {/* Scheduled → confirm departed */}
                        {(shipment.status === 'PackingListGenerated') && (
                            <div className="flex flex-col items-end gap-2">
                                {dispatchValidation.errors.map((err, i) => (
                                    <span key={i} className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-800/30">
                                        {err}
                                    </span>
                                ))}
                                <button
                                    onClick={handleDepart}
                                    disabled={isActioning || !dispatchValidation.isValid}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
                                        !dispatchValidation.isValid
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none border border-gray-200 dark:border-gray-700'
                                            : isDepartureOverdue
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/20'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                                    } disabled:opacity-50`}
                                >
                                    {isActioning ? <Loader2 size={14} className="animate-spin" /> : <Plane size={14} />}
                                    {isActioning ? 'Updating...' : 'Confirm Flight Departed'}
                                </button>
                            </div>
                        )}

                        {/* Departed → confirm cargo shipped */}
                        {shipment.status === 'Departed' && (
                            <button
                                onClick={handleShip}
                                disabled={isActioning}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 ${
                                    isArrivalOverdue
                                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                                        : 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                                }`}
                            >
                                {isActioning
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <CheckCircle size={14} />}
                                {isActioning ? 'Updating...' : 'Confirm Cargo Shipped'}
                            </button>
                        )}

                        {shipment.status === 'Shipped' && (
                            <span className="px-4 py-2 rounded-lg text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-2">
                                <CheckCircle size={14} /> Shipped
                            </span>
                        )}
                    </div>
                </div>

                <DeleteDocModal 
                    isOpen={!!deleteDocTarget}
                    onClose={() => setDeleteDocTarget(null)}
                    onConfirm={handleDeleteDocument}
                    fileName={deleteDocTarget?.name || ''}
                    isDeleting={isActioning}
                />
            </div>
        </div>,
        document.body
    );
};

const DeleteDocModal = ({ isOpen, onClose, onConfirm, fileName, isDeleting }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, fileName: string, isDeleting: boolean }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <h3 className="text-base font-bold text-red-800 dark:text-red-300">Delete Export Document</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{fileName}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {isDeleting ? 'Deleting...' : 'Delete File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShipmentDetailsModal;
