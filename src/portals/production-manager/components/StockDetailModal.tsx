import { useState, useEffect } from 'react';
import { X, Download, AlertTriangle, Loader2, Package, MapPin, Calendar, Weight, User, ClipboardCheck, Layers, Tag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

interface StockDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockItem: any | null;
    onMarkedSpoiled?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    'Available':           { label: 'Available',           color: 'text-green-700',  bg: 'bg-green-50 dark:bg-green-900/30'   },
    'Partially Allocated': { label: 'Partially Allocated', color: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-900/30'   },
    'Fully Allocated':     { label: 'Fully Allocated',     color: 'text-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    'Spoiled':             { label: 'Spoiled',             color: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-900/30'       },
};

const StockDetailModal = ({ isOpen, onClose, stockItem, onMarkedSpoiled }: StockDetailModalProps) => {
    const [linkedBatches, setLinkedBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [isMarkingSpoiled, setIsMarkingSpoiled] = useState(false);
    const [confirmSpoil, setConfirmSpoil] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToastContext();

    useEffect(() => {
        if (isOpen && stockItem?.rawId) {
            setLoadingBatches(true);
            setConfirmSpoil(false);
            setError(null);
            api.get('/export-batches')
                .then(res => {
                    const all = res.data?.data || res.data || [];
                    // Match export batches whose processingBatchId._id === this stock's rawId
                    const linked = all.filter((eb: any) => {
                        const pbId = eb.processingBatchId?._id || eb.processingBatchId;
                        return pbId === stockItem.rawId;
                    });
                    setLinkedBatches(linked);
                })
                .catch(console.error)
                .finally(() => setLoadingBatches(false));
        }
    }, [isOpen, stockItem]);

    if (!isOpen || !stockItem) return null;

    const cfg = statusConfig[stockItem.status] || statusConfig['Available'];

    const handleMarkSpoiled = async () => {
        if (!confirmSpoil) {
            setConfirmSpoil(true);
            return;
        }
        setIsMarkingSpoiled(true);
        setError(null);
        try {
            // PATCH /processing-batches/:id/spoil — PM marks stock as spoiled
            await api.patch(`/processing-batches/${stockItem.rawId}/spoil`, {});
            showToast("Stock Updated", "Item has been marked as spoiled and removed from active inventory");
            onMarkedSpoiled?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to mark as spoiled.');
            setConfirmSpoil(false);
        } finally {
            setIsMarkingSpoiled(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!stockItem) return;
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const commonHeadStyles: any = {
                textColor: [255, 255, 255],
                fontSize: 8.5,
                fontStyle: 'bold',
                fillColor: [92, 184, 92]
            };
            const commonBodyStyles: any = {
                fontSize: 8,
                textColor: [0, 0, 0],
                cellPadding: { top: 4, bottom: 4, left: 2, right: 2 }
            };
            const alternateRowStyles: any = { fillColor: [249, 250, 251] };

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

            // ── 2. Report Title ───────────────────────────────────────
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(`STOCK ITEM REPORT — ${stockItem.id}`, 15, 42);

            // ── 3. Summary fields ─────────────────────────────────────
            const summaryFields = [
                { label: 'Crop',            value: stockItem.produce },
                { label: 'Grade',           value: stockItem.grade },
                { label: 'Farmer / Source', value: stockItem.farmerSource },
                { label: 'Storage Room',    value: stockItem.storageLocation },
                { label: 'Processed (QC)',  value: `${stockItem.processedKg} kg` },
                { label: 'Rejected (QC)',   value: `${stockItem.rejectedKg ?? 0} kg` },
                { label: 'Allocated',       value: stockItem.totalAllocated > 0 ? `${stockItem.totalAllocated} kg` : '—' },
                { label: 'Available',       value: `${stockItem.availableKg} kg` },
                { label: 'Status',          value: stockItem.status },
                { label: 'Date In Stock',   value: stockItem.dateInStock?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || '—' },
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

            // ── 4. Export Batches Table ───────────────────────────────
            yPos += 4;
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39);
            doc.text('EXPORT BATCHES FROM THIS STOCK', 15, yPos);

            if (linkedBatches.length === 0) {
                doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text('No export batches have been created from this stock item yet.', 15, yPos + 10);
                yPos += 20;
            } else {
                autoTable(doc, {
                    startY: yPos + 5,
                    head: [['BATCH ID', 'CLIENT', 'DESTINATION', 'ALLOCATED (KG)', 'BOXES', 'TARGET DATE', 'STATUS']],
                    body: linkedBatches.map(eb => [
                        eb.batchId || '—',
                        eb.clientName || '—',
                        eb.destination || '—',
                        String(eb.allocatedWeightKg || 0),
                        String(eb.boxCount || 0),
                        eb.targetShipmentDate
                            ? new Date(eb.targetShipmentDate).toLocaleDateString('en-GB')
                            : '—',
                        eb.status === 'ReadyForExport' ? 'Ready for Export' : (eb.status || '—'),
                    ]),
                    theme: 'striped',
                    headStyles: commonHeadStyles,
                    bodyStyles: commonBodyStyles,
                    alternateRowStyles,
                    margin: { left: 15, right: 15, bottom: 30 },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index === 6) {
                            const s = String(data.cell.raw).toLowerCase();
                            if (s === 'ready for export') data.cell.styles.textColor = '#16a34a';
                            else if (s === 'shipped')  data.cell.styles.textColor = '#2563eb';
                            else if (s === 'pending')  data.cell.styles.textColor = '#7c3aed';
                        }
                    }
                });
                yPos = (doc as any).lastAutoTable.finalY;
            }

            // ── 5. System Insights ────────────────────────────────────
            let lastY = (doc as any).lastAutoTable?.finalY || yPos;
            if (lastY > 240) { doc.addPage(); lastY = 20; }
            doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
            doc.text('• This report details stock batch history and export allocations.', 15, lastY + 25);
            doc.text(`• Export Batches: ${linkedBatches.length}`, 15, lastY + 31);

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

            doc.save(`FreshSarura_Stock_${stockItem.id}_Report.pdf`);
        } catch (err) {
            console.error('Failed to generate stock report:', err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const exportBatchStatusColors: Record<string, string> = {
        Pending:        'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        ReadyForExport: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        Shipped:        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-teal-50/50 dark:bg-teal-900/10 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                {stockItem.id}
                            </h2>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Stock Item Details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Package,       label: 'Crop',             value: stockItem.produce },
                            { icon: Tag,           label: 'Grade',            value: stockItem.grade },
                            { icon: User,          label: 'Farmer / Source',  value: stockItem.farmerSource },
                            { icon: MapPin,        label: 'Storage Room',     value: stockItem.storageLocation },
                            { icon: Weight,        label: 'Processed (QC)',   value: `${stockItem.processedKg?.toLocaleString()} kg` },
                            { icon: AlertTriangle, label: 'Rejected (QC)',    value: `${stockItem.rejectedKg?.toLocaleString() ?? '—'} kg${
                                stockItem.primaryDefectType && stockItem.primaryDefectType !== 'None' 
                                    ? ` — ${stockItem.primaryDefectType}` 
                                    : ''
                            }` },
                            { icon: Layers,        label: 'Allocated',        value: stockItem.totalAllocated > 0 ? `${stockItem.totalAllocated.toLocaleString()} kg` : '—' },
                            { icon: ClipboardCheck,label: 'Available',        value: `${stockItem.availableKg?.toLocaleString()} kg` },
                            { icon: Calendar,      label: 'Date In Stock',    value: stockItem.dateInStock?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                        ].map((row, i) => row.value && (
                            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                                <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                                    <row.icon size={11} /> {row.label}
                                </p>
                                <p className={`text-sm font-bold text-gray-900 dark:text-white ${
                                    row.label === 'Rejected (QC)' && stockItem.rejectedKg > 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : ''
                                }`}>
                                    {row.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Linked Export Batches */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Layers size={11} />
                            Export Batches from this Stock
                        </p>

                        {loadingBatches ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                                <Loader2 size={14} className="animate-spin" /> Loading...
                            </div>
                        ) : linkedBatches.length === 0 ? (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-400 italic">
                                No export batches created from this stock yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {linkedBatches.map((eb: any) => (
                                    <div
                                        key={eb._id}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                                {eb.batchId}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {eb.clientName} · {eb.destination} · {eb.allocatedWeightKg} kg
                                            </p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${exportBatchStatusColors[eb.status] || exportBatchStatusColors.Pending}`}>
                                            {eb.status === 'ReadyForExport' ? 'Ready' : eb.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3 flex-shrink-0">
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

                    {stockItem.status !== 'Spoiled' && stockItem.status !== 'Fully Allocated' && (
                        <button
                            onClick={handleMarkSpoiled}
                            disabled={isMarkingSpoiled}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                                confirmSpoil
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                                    : 'bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50'
                            } ${isMarkingSpoiled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isMarkingSpoiled
                                ? <><Loader2 size={16} className="animate-spin" /> Marking...</>
                                : confirmSpoil
                                    ? <><AlertTriangle size={16} /> Confirm — Mark as Spoiled</>
                                    : <><AlertTriangle size={16} /> Mark as Spoiled</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StockDetailModal;
