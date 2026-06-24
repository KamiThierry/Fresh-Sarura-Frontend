import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, Package, MapPin, Calendar, Tag, Weight, Plane, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';
import jsPDF from 'jspdf';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

interface BatchDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: any | null;
    onStatusChange?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    Pending:        { label: 'Pending',           color: 'text-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    ReadyForExport: { label: 'Ready for Export',  color: 'text-green-700',  bg: 'bg-green-50  dark:bg-green-900/30'  },
    Shipped:        { label: 'Shipped',           color: 'text-blue-700',   bg: 'bg-blue-50   dark:bg-blue-900/30'   },
};

const BatchDetailModal = ({ isOpen, onClose, batch, onStatusChange }: BatchDetailModalProps) => {
    const [isMarking, setIsMarking] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkedShipment, setLinkedShipment] = useState<any>(null);
    const { showToast } = useToastContext();

    useEffect(() => {
        if (isOpen && batch?._id) {
            api.get('/shipments').then(res => {
                const all = res.data?.data || res.data || [];
                const found = all.find((s: any) =>
                    s.exportBatches?.some((b: any) => (b._id || b) === batch._id)
                );
                setLinkedShipment(found || null);
            }).catch(console.error);
        }
    }, [isOpen, batch]);

    if (!isOpen || !batch) return null;

    const cfg = statusConfig[batch.status] || statusConfig.Pending;

    const handleMarkReady = async () => {
        setIsMarking(true);
        setError(null);
        try {
            await api.patch(`/export-batches/${batch._id}/ready`, {});
            showToast("Batch Updated", "Export batch has been marked as ready for export");
            onStatusChange?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to mark as ready.');
        } finally {
            setIsMarking(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!batch) return;
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // ── 1. Header ──────────────────────────────────────────────
            try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
            doc.setTextColor(21, 128, 61);
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text('Fresh Sarura', 28, 19);
            doc.setTextColor(107, 114, 128);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
            doc.text('Export & Farmer Hub', 28, 23);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39);
            doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
            doc.setFontSize(8); doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128);
            doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
            doc.setDrawColor(229, 231, 235);
            doc.line(15, 30, pageWidth - 15, 30);

            // ── 2. Title ───────────────────────────────────────────────
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(`EXPORT BATCH REPORT — ${batch.batchId}`, 15, 42);

            // ── 3. Summary Fields ─────────────────────────────────────
            const summaryFields = [
                { label: 'Crop',            value: batch.cropName },
                { label: 'Grade',           value: batch.gradeLabel || '—' },
                { label: 'Client',          value: batch.clientName },
                { label: 'Destination',     value: batch.destination },
                { label: 'Allocated Weight',value: `${batch.allocatedWeightKg?.toLocaleString()} kg` },
                { label: 'Box Count',       value: `${batch.boxCount} boxes` },
                { label: 'Weight per Box',  value: `${batch.weightPerBoxKg} kg` },
                { label: 'Target Date',     value: batch.targetShipmentDate ? new Date(batch.targetShipmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Status',          value: batch.status === 'ReadyForExport' ? 'Ready for Export' : batch.status },
            ];

            let yPos = 52;
            doc.setFontSize(9);
            summaryFields.forEach(field => {
                doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
                doc.text(field.label, 15, yPos);
                doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
                doc.text(String(field.value || '—'), pageWidth - 15, yPos, { align: 'right' });
                doc.setDrawColor(243, 244, 246);
                doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
                yPos += 10;
            });

            // ── 4. Shipment Section ───────────────────────────────────
            if (linkedShipment) {
                yPos += 5;
                doc.setFillColor(249, 250, 251);
                doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
                
                doc.setTextColor(79, 70, 229); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                doc.text('ASSIGNED SHIPMENT', 20, yPos + 7);
                
                doc.setTextColor(17, 24, 39); doc.setFontSize(10);
                doc.text(linkedShipment.plNumber, 20, yPos + 14);
                
                doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
                doc.text(`${linkedShipment.flightNumber} → ${linkedShipment.destination} | ${new Date(linkedShipment.departureDate).toLocaleDateString('en-GB')}`, 20, yPos + 20);
                
                yPos += 35;
            }

            // ── 5. System Insights ──
            let lastY = (doc as any).lastAutoTable?.finalY || yPos;
            if (lastY > 240) { doc.addPage(); lastY = 20; }
            doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
            doc.text('• This report details export batch readiness and assignments.', 15, lastY + 25);
            doc.text(`• Target Client: ${batch.clientName ? batch.clientName.toUpperCase() : 'N/A'}`, 15, lastY + 31);

            // ── 6. Footer ─────────────────────────────────────────────
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(229, 231, 235);
                doc.line(15, 275, pageWidth - 15, 275);
                doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
                doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
                const footerY = 288;
                doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, footerY, { align: 'right' });
            }

            doc.save(`Sarura_Batch_${batch.batchId}_Report.pdf`);
        } catch (err) {
            console.error('Failed to generate batch report:', err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{batch.batchId}</h2>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Export Batch Details</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Package, label: 'Crop', value: batch.cropName },
                            { icon: Tag, label: 'Grade', value: batch.gradeLabel || '—' },
                            { icon: MapPin, label: 'Client', value: batch.clientName },
                            { icon: MapPin, label: 'Destination', value: batch.destination },
                            { icon: Weight, label: 'Total Weight', value: `${batch.allocatedWeightKg?.toLocaleString()} kg` },
                            { icon: Package, label: 'Boxes', value: `${batch.boxCount} × ${batch.weightPerBoxKg} kg` },
                            { icon: Calendar, label: 'Target Date', value: batch.targetShipmentDate ? new Date(batch.targetShipmentDate).toLocaleDateString() : '—' },
                            { icon: Calendar, label: 'Created', value: new Date(batch.createdAt).toLocaleDateString() },
                        ].map((row, i) => (row.value &&
                            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                                <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                                    <row.icon size={11} /> {row.label}
                                </p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{row.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Shipment Info */}
                    {linkedShipment && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 border border-indigo-100 dark:border-indigo-900/30">
                            <p className="text-xs text-indigo-500 font-medium mb-1 flex items-center gap-1">
                                <Plane size={11} /> Assigned to Shipment
                            </p>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                                {linkedShipment.plNumber}
                            </p>
                            <p className="text-xs text-indigo-500 mt-0.5">
                                {linkedShipment.flightNumber} → {linkedShipment.destination} ·{' '}
                                {new Date(linkedShipment.departureDate).toLocaleDateString()}
                            </p>
                            <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                linkedShipment.status === 'Shipped'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                                {linkedShipment.status === 'Shipped' ? '✈ Shipped' : '📋 Scheduled'}
                            </span>
                        </div>
                    )}

                    {/* Stock reference */}
                    {batch.processingBatchId && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                            <p className="text-xs text-gray-400 font-medium mb-1">Stock Reference</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                {batch.processingBatchId?.stockId || batch.processingBatchId?._id || '—'}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3">
                    <button
                        onClick={handleDownloadReport}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf
                            ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                            : <><Download size={16} /> Download Report</>
                        }
                    </button>

                    {batch.status === 'Pending' && (
                        <button
                            onClick={handleMarkReady}
                            disabled={isMarking}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                                isMarking
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
                            }`}
                        >
                            {isMarking ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {isMarking ? 'Updating...' : 'Mark as Ready for Export'}
                        </button>
                    )}

                    {batch.status === 'ReadyForExport' && (
                        <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/30">
                            <CheckCircle2 size={16} /> Ready for Export
                        </span>
                    )}

                    {batch.status === 'Shipped' && (
                        <span className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border ${
                            linkedShipment?.status === 'Shipped'
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200'
                                : linkedShipment?.status === 'Departed'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                        }`}>
                            <CheckCircle2 size={16} />
                            {linkedShipment?.status === 'Shipped'
                                ? 'Shipped'
                                : linkedShipment?.status === 'Departed'
                                ? 'In Transit'
                                : 'Scheduled'}
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BatchDetailModal;
