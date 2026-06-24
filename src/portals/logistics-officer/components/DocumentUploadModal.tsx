import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedShipmentId?: string | null;
    onSuccess: () => void;
}

const DOCUMENT_TYPES = [
    { id: 'CommercialInvoice',   label: 'Commercial Invoice' },
    { id: 'PackingList',         label: 'Packing List' },
    { id: 'PhytosanitaryCert',   label: 'Phytosanitary Certificate' },
    { id: 'AWB',                 label: 'Airway Bill (AWB)' },
    { id: 'Other',               label: 'Other' },
];

const DocumentUploadModal = ({ isOpen, onClose, preselectedShipmentId, onSuccess }: DocumentUploadModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileBase64, setFileBase64] = useState<string | null>(null);
    const [docType, setDocType] = useState('');
    const [selectedShipmentId, setSelectedShipmentId] = useState('');
    const [shipmentSearch, setShipmentSearch] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Real shipments for selector
    const [shipments, setShipments] = useState<any[]>([]);
    const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
    const shipmentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setFile(null); setFileBase64(null); setDocType('');
            setShipmentSearch(''); setError(null); setIsSubmitting(false);
            setSelectedShipmentId(preselectedShipmentId || '');
            // Fetch shipments
            api.get('/shipments').then(res => setShipments(res.data || [])).catch(console.error);
        }
    }, [isOpen, preselectedShipmentId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (shipmentRef.current && !shipmentRef.current.contains(e.target as Node)) {
                setShowShipmentDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    if (!isOpen) return null;

    const handleFileSelected = (selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            setError('Only PDF documents are accepted for export documentation.');
            return;
        }
        setFile(selectedFile);
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => setFileBase64(reader.result as string);
        reader.readAsDataURL(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
    };

    const filteredShipments = shipments.filter(s =>
        s.plNumber?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.flightNumber?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.destination?.toLowerCase().includes(shipmentSearch.toLowerCase())
    );

    const selectedShipment = shipments.find(s => s._id === selectedShipmentId);

    const handleSubmit = async () => {
        if (!file || !fileBase64 || !docType || !selectedShipmentId) {
            setError('Please select a file, document type, and link a shipment.'); return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post('/export-documents', {
                shipmentId: selectedShipmentId || undefined,
                docType,
                fileName: file.name,
                fileUrl: fileBase64,   // base64 — same as FieldReport.proofUrl pattern
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload Document</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Dropzone — exact same UI */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                            isDragging
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            {file ? <CheckCircle size={24} /> : <Upload size={24} />}
                        </div>
                        {file ? (
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB • Ready to upload</p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-500 mt-1">PDF only (max 10MB)</p>
                            </div>
                        )}
                    </div>

                    {/* Document Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Document Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Select Type...</option>
                            {DOCUMENT_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Link to Shipment — real shipment selector */}
                    <div ref={shipmentRef} className="relative">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Link to Shipment <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search PL number or flight..."
                                value={selectedShipment ? `${selectedShipment.plNumber} — ${selectedShipment.flightNumber}` : shipmentSearch}
                                onChange={e => { setShipmentSearch(e.target.value); setSelectedShipmentId(''); setShowShipmentDropdown(true); }}
                                onFocus={() => setShowShipmentDropdown(true)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            {selectedShipmentId && (
                                <button onClick={() => { setSelectedShipmentId(''); setShipmentSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown */}
                        {showShipmentDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                                {filteredShipments.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-gray-400 text-center">No shipments found</div>
                                ) : filteredShipments.map(s => (
                                    <div
                                        key={s._id}
                                        onClick={() => { setSelectedShipmentId(s._id); setShowShipmentDropdown(false); }}
                                        className={`px-4 py-2.5 cursor-pointer transition-colors text-sm ${selectedShipmentId === s._id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono font-bold">{s.plNumber}</span>
                                            <span className="text-xs text-gray-500">{s.destination}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">{s.flightNumber}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedShipment && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle size={12} /> Linked to {selectedShipment.plNumber}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!file || !docType || !selectedShipmentId || isSubmitting}
                        className={`px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2 ${
                            !file || !docType || !selectedShipmentId || isSubmitting
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        {isSubmitting ? 'Uploading...' : 'Upload Document'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DocumentUploadModal;
