import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X, Search, QrCode, User, Scale, Plane, FileText, CheckCircle2, ArrowRight, Loader2, AlertCircle, Package } from 'lucide-react';
import { api } from '../../../lib/api';
import jsPDF from 'jspdf';
import logo from '@/assets/sarura_logo_nav.png';
import autoTable from 'jspdf-autotable';
import { getReportFooterText } from '@/lib/utils';

interface FindBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const nodeColors: Record<string, string> = {
    source:   'bg-green-100 text-green-600',
    intake:   'bg-blue-100 text-blue-600',
    stock:    'bg-purple-100 text-purple-600',
    export:   'bg-orange-100 text-orange-600',
    shipment: 'bg-sky-100 text-sky-600',
};

function NodeIcon({ type }: { type: string }) {
    if (type === 'source')   return <User size={18} />;
    if (type === 'intake')   return <Scale size={18} />;
    if (type === 'stock')    return <Package size={18} />;
    if (type === 'export')   return <Package size={18} />;
    if (type === 'shipment') return <Plane size={18} />;
    return <Search size={18} />;
}

const FindBatchModal = ({ isOpen, onClose }: FindBatchModalProps) => {
    const navigate = useNavigate();
    const [view, setView] = useState<'search' | 'timeline'>('search');
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [traceData, setTraceData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [availableIds, setAvailableIds] = useState<{ id: string; type: string; produce?: string }[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchIds = async () => {
            try {
                const [stockRes, batchRes] = await Promise.all([
                    api.get('/stock'),
                    api.get('/export-batches')
                ]);
                const stockData = stockRes.data?.data || stockRes.data || [];
                const batchData = batchRes.data?.data || batchRes.data || [];

                const ids = [
                    ...stockData.map((s: any) => ({ id: s.stockId, type: 'Stock', produce: s.cropName })),
                    ...batchData.map((b: any) => ({ id: b.batchId, type: 'Export Batch', produce: b.cropName }))
                ].filter(item => item.id);
                setAvailableIds(ids);
            } catch (err) {
                console.error('Failed to fetch available IDs', err);
            }
        };
        if (isOpen) fetchIds();
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = availableIds.filter(opt => 
        opt.id.toLowerCase().includes(query.toLowerCase()) || 
        opt.produce?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (!isOpen) return null;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim().toUpperCase();
        if (!trimmed) return;

        setIsSearching(true);
        setError(null);
        setTraceData(null);

        try {
            const res = await api.get(`/traceability/${trimmed}`);
            setTraceData(res.data?.data || res.data);
            setView('timeline');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Batch not found. Check the ID and try again.';
            setError(msg);
        } finally {
            setIsSearching(false);
        }
    };

    const resetSearch = () => {
        setView('search');
        setQuery('');
        setTraceData(null);
        setError(null);
    };

    const handleDownloadTraceabilityPDF = async () => {
        if (!traceData) return;

        const trace = traceData.nodes ? traceData : traceData.data;
        if (!trace?.nodes?.length) return;

        const doc       = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const toTC = (s: string) =>
            String(s).toLowerCase().split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // ── 1. Header (identical to Reports.tsx) ──
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10);
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.line(15, 30, pageWidth - 15, 30);

        // ── 2. Certificate Title Block ──
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('TRACEABILITY CERTIFICATE', 15, 42);

        // Summary fields — same style as Reports.tsx
        const summaryFields = [
            { label: 'Batch Reference',  value: trace.batchId },
            { label: 'Total Stages',     value: `${trace.nodes.length} verified lifecycle stages` },
            { label: 'Generated',        value: timestamp },
            { label: 'Status',           value: 'VERIFIED — Complete farm-to-export chain' },
        ];

        let yPos = 50;
        doc.setFontSize(9);
        summaryFields.forEach(field => {
            doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
            doc.text(field.label, 15, yPos);
            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
            doc.text(String(field.value), pageWidth - 15, yPos, { align: 'right' });
            doc.setDrawColor(243, 244, 246);
            doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
            yPos += 9;
        });

        yPos += 4;

        // ── 3. Stages ──
        const stageLabels: Record<string, string> = {
            source:   'STAGE 1 — FARM ORIGIN',
            intake:   'STAGE 2 — FIELD PICKUP & INTAKE',
            stock:    'STAGE 3 — PACKHOUSE PROCESSING',
            export:   'STAGE 4 — EXPORT BATCH',
            shipment: 'STAGE 5 — SHIPMENT',
        };

        const headStyles: any  = {
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
            fillColor: [92, 184, 92]   // same green as Reports.tsx
        };
        const bodyStyles: any  = {
            fontSize: 8,
            textColor: [0, 0, 0],
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }
        };
        const altStyles: any   = { fillColor: [249, 250, 251] };

        trace.nodes.forEach((node: any, index: number) => {
            // Page break check
            if (yPos > 240) { doc.addPage(); yPos = 20; }

            const stageLabel = stageLabels[node.type] || `STAGE ${index + 1}`;

            // Stage header — using autoTable for consistency
            autoTable(doc, {
                startY: yPos,
                head: [[stageLabel, toTC(node.title)]],
                body: node.details.map((d: any) => [
                    String(d.label).toUpperCase(),
                    String(d.value || 'N/A')
                ]),
                theme: 'striped',
                headStyles,
                bodyStyles,
                alternateRowStyles: altStyles,
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [107, 114, 128], cellWidth: 55 },
                    1: { textColor: [17, 24, 39] }
                },
                margin: { left: 15, right: 15, bottom: 10 },
                didParseCell: (data) => {
                    // Highlight Done/Dispatched/Shipped in green
                    if (data.section === 'body' && data.column.index === 1) {
                        const v = String(data.cell.raw).toLowerCase();
                        if (['done', 'dispatched', 'shipped', 'active'].includes(v)) {
                            data.cell.styles.textColor = '#16a34a';
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY;

            // Divider between stages — simple spacing (stage headers are enough separator)
            if (index < trace.nodes.length - 1) {
                yPos += 12;
            } else {
                yPos += 8;
            }
        });

        // ── 4. Verification Summary Box ──
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        autoTable(doc, {
            startY: yPos,
            head: [['CERTIFICATE OF SUPPLY CHAIN INTEGRITY']],
            body: [
                [`This certificate verifies that batch ${trace.batchId} has completed ${trace.nodes.length} verified`],
                [`lifecycle stages under Fresh Sarura's traceability framework,`],
                [`ensuring full farm-to-export accountability.`],
            ],
            theme: 'plain',
            headStyles: { ...headStyles, halign: 'center' },
            bodyStyles: { ...bodyStyles, halign: 'center', textColor: [107, 114, 128] },
            margin: { left: 15, right: 15 },
        });

        // ── 5. System Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report confirms the batch processing lifecycle.', 15, lastY + 25);
        doc.text(`• Nodes Evaluated: ${trace.nodes?.length || 0}`, 15, lastY + 31);

        // ── 6. Footer (identical to Reports.tsx) ──
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

        doc.save(`FreshSarura_Traceability_${trace.batchId}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col border border-gray-100 dark:border-gray-700"
                style={{ maxHeight: '90vh', minHeight: '520px' }}
            >
                {/* Header — fixed */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="text-orange-600" size={20} />
                            Traceability Lookup
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Track produce journey from farm to export</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── SEARCH VIEW ── */}
                    {view === 'search' && (
                        <div className="flex flex-col items-center justify-center text-center px-8 py-10">
                            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
                                <QrCode size={40} className="text-orange-600" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Track a Batch</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs text-sm">
                                Enter an Export Batch ID (e.g.{' '}
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">EB-JMOHGW</span>)
                                {' '}or Stock ID (e.g.{' '}
                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">STK-4X2NNN</span>).
                            </p>

                            <form onSubmit={handleSearch} className="w-full max-w-sm space-y-4">
                                <div className="relative" ref={dropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="EB-XXXXXX or STK-XXXXXX"
                                        value={query}
                                        onFocus={() => setShowDropdown(true)}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-center text-base font-mono font-medium tracking-wider uppercase dark:text-white"
                                    />

                                    {showDropdown && query.trim() && filteredOptions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {filteredOptions.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        setQuery(opt.id);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{opt.id}</p>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{opt.produce || 'Unknown Produce'}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.type === 'Stock' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {opt.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
                                        <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!query.trim() || isSearching}
                                    className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSearching
                                        ? <><Loader2 size={18} className="animate-spin" /> Searching...</>
                                        : 'Trace Journey'
                                    }
                                </button>
                            </form>

                            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 w-full max-w-xs">
                                <button className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-orange-600 transition-colors mx-auto">
                                    <QrCode size={16} /> Scan QR Code via Camera
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── TIMELINE VIEW ── */}
                    {view === 'timeline' && traceData && (
                        <div>
                            {/* Result header */}
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 border-b border-orange-100 dark:border-orange-800/30">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Batch Found</span>
                                    <button onClick={resetSearch} className="text-xs text-gray-500 underline hover:text-gray-700">New Search</button>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{traceData.batchId}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                        <CheckCircle2 size={11} /> VERIFIED
                                    </span>
                                    <span className="text-xs text-gray-500">{traceData.nodes?.length} lifecycle stages</span>
                                </div>
                            </div>

                            {/* Journey nodes */}
                            <div className="px-6 py-6">
                                <div className="relative pl-12 border-l-2 border-dashed border-gray-200 dark:border-gray-600 space-y-8">
                                    {(traceData.nodes || []).map((node: any) => (
                                        <div key={node.id} className="relative">
                                            <div className="absolute -left-[46px] bg-white dark:bg-gray-800 p-0.5">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow ${nodeColors[node.type] || 'bg-gray-100 text-gray-500'}`}>
                                                    <NodeIcon type={node.type} />
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{node.title}</h4>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                {(node.details || []).map((d: any, i: number) => (
                                                    <div key={i} className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{d.label}</span>
                                                        <span className={`text-xs font-semibold text-gray-700 dark:text-gray-200 ${d.highlight || ''}`}>{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {node.action && (
                                                <button 
                                                    onClick={() => {
                                                        if (node.action.link) {
                                                            navigate(node.action.link);
                                                            onClose();
                                                        }
                                                    }}
                                                    className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                                                >
                                                    <ArrowRight size={12} /> {node.action.label}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6">
                                <button 
                                    onClick={handleDownloadTraceabilityPDF}
                                    className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                >
                                    <FileText size={16} /> Download Full Traceability Report
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FindBatchModal;
