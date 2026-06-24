import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import {
    Download, Calendar, TrendingUp, TrendingDown, Minus,
    Package, Leaf, Plane, BarChart3, ChevronDown,
    FileSpreadsheet, FileText, Thermometer
} from 'lucide-react';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import html2canvas from 'html2canvas';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
type Tab = 'overview' | 'farmers' | 'production' | 'export';

// ─── KPI Card ─────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, iconBg, trend, trendLabel }: {
    label: string; value: string; icon: React.ElementType;
    iconBg: string; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
}) => {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <div className={`p-2 rounded-xl ${iconBg}`}><Icon size={18} className="opacity-80" /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
            {trendLabel && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                    <TrendIcon size={13} /><span>{trendLabel}</span>
                </div>
            )}
        </div>
    );
};

// ─── Badge ────────────────────────────────────────────────────────
const Badge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        Shipped:              'bg-green-100 text-green-700',
        PackingListGenerated: 'bg-blue-100 text-blue-700',
        Draft:                'bg-gray-100 text-gray-600',
        Done:                 'bg-green-100 text-green-700',
        Processing:           'bg-amber-100 text-amber-700',
        RoomRequested:        'bg-purple-100 text-purple-700',
        Active:               'bg-emerald-100 text-emerald-700',
        active:               'bg-emerald-100 text-emerald-700',
        in_progress:          'bg-amber-100 text-amber-700',
        harvesting:           'bg-amber-100 text-amber-700',
        completed:            'bg-gray-100 text-gray-500',
        Inactive:             'bg-red-100 text-red-700',
    };
    return (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status === 'in_progress' || status === 'harvesting' ? 'In Progress' : (status ? status.charAt(0).toUpperCase() + status.slice(1) : '')}
        </span>
    );
};

// ─── Table Shell ──────────────────────────────────────────────────
const TableShell = ({ title, headers, children, total, page, perPage, onPage }: {
    title: string; headers: string[]; children: React.ReactNode;
    total: number; page: number; perPage: number; onPage: (p: number) => void;
}) => {
    const totalPages = Math.ceil(total / perPage);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                            {headers.map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">{children}</tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400">
                        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => onPage(page - 1)} disabled={page === 1}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => onPage(p)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${page === p ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{p}</button>
                        ))}
                        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const EmptyRow = ({ cols, msg = 'No data in this period.' }: { cols: number; msg?: string }) => (
    <tr><td colSpan={cols} className="py-10 text-center text-gray-400 text-sm">{msg}</td></tr>
);

const PER_PAGE = 8;

// ═══════════════════════════════════════════════════════════════════
const AnalyticsReporting = () => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate]       = useState(() => new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab]   = useState<Tab>('overview');
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [farmerPage,     setFarmerPage]     = useState(1);
    const [cyclePage,      setCyclePage]      = useState(1);
    const [productionPage, setProductionPage] = useState(1);
    const [shipmentPage,   setShipmentPage]   = useState(1);

    const [stock,     setStock]     = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);
    const [farmers,   setFarmers]   = useState<any[]>([]);
    const [cycles,    setCycles]    = useState<any[]>([]);
    const [exportBatches, setExportBatches] = useState<any[]>([]);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const q = `?startDate=${startDate}&endDate=${endDate}`;
                const [stockRes, shipmentsRes, farmersRes, cyclesRes, batchesRes] = await Promise.all([
                    api.get(`/stock${q}`),
                    api.get(`/shipments${q}`),
                    api.get(`/farmers${q}`),
                    api.get(`/crop-cycles${q}`),
                    api.get(`/export-batches`), // Always get all batches for true allocation math
                ]);
                setStock(stockRes.data?.data         ?? stockRes?.data         ?? []);
                setShipments(shipmentsRes.data?.data ?? shipmentsRes?.data     ?? []);
                setFarmers(farmersRes.farmers         ?? farmersRes.data?.farmers ?? farmersRes.data ?? []);
                setCycles(cyclesRes.data?.data        ?? cyclesRes?.data       ?? []);
                setExportBatches(batchesRes.data?.data ?? batchesRes?.data     ?? []);
            } catch (err) {
                console.error('Failed to fetch analytics data', err);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, [startDate, endDate]);

    // Compute inventoryItems for allocation math
    const inventoryItems = useMemo(() => {
        const allocationMap: Record<string, number> = {};
        exportBatches.forEach(b => {
            const id = b.processingBatchId?._id || b.processingBatchId;
            if (!id) return;
            allocationMap[id] = (allocationMap[id] || 0) + (b.allocatedWeightKg || 0);
        });

        return stock
            .filter(s => s.stockId && s.stockId.startsWith('STK-'))
            .map(s => {
                const allocated = allocationMap[s._id] || 0;
                const available = Math.max(0, (s.processedWeightKg || 0) - allocated);
                return {
                    ...s,
                    processedKg: s.processedWeightKg || 0,
                    availableKg: available,
                };
            });
    }, [stock, exportBatches]);

    const totalReceived   = stock.reduce((s, b) => s + (b.receivedWeightKg  || 0), 0);
    const totalProcessed  = stock.reduce((s, b) => s + (b.processedWeightKg || 0), 0);
    const totalRejected   = stock.reduce((s, b) => s + (b.rejectedWeightKg  || 0), 0);
    
    // Unified coldRoomStockKg uses available weight
    const coldRoomStockKg = inventoryItems.reduce((sum, i) => sum + i.availableKg, 0);
    
    const nearlyEmptyCount = inventoryItems.filter(i => 
        i.availableKg > 0 && i.availableKg < i.processedKg * 0.2
    ).length;

    const fullyDepletedCount = inventoryItems.filter(i => 
        i.availableKg === 0 && i.status !== 'Spoiled'
    ).length;

    const lossRate        = totalReceived > 0 ? ((totalRejected / totalReceived) * 100).toFixed(1) : '0';
    const shippedCount      = shipments.filter(s => s.status === 'Shipped');
    const totalExportedKg = shippedCount.reduce((s, sh) => s + (sh.totalWeightKg || 0), 0);

    const monthlyStockData = useMemo(() => {
        const map: Record<string, any> = {};
        stock.forEach(b => {
            const month = new Date(b.updatedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!map[month]) map[month] = { month, received: 0, processed: 0, rejected: 0 };
            map[month].received  += b.receivedWeightKg  || 0;
            map[month].processed += b.processedWeightKg || 0;
            map[month].rejected  += b.rejectedWeightKg  || 0;
        });
        return Object.values(map).slice(-6);
    }, [stock]);

    const monthlyShipmentData = useMemo(() => {
        const map: Record<string, any> = {};
        shipments.forEach(s => {
            const month = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!map[month]) map[month] = { month, shipments: 0, weightTons: 0 };
            map[month].shipments  += 1;
            map[month].weightTons += parseFloat(((s.totalWeightKg || 0) / 1000).toFixed(2));
        });
        return Object.values(map).slice(-6);
    }, [shipments]);

    // ── Paginated slices ──
    const pagedFarmers    = farmers.slice((farmerPage - 1)     * PER_PAGE, farmerPage     * PER_PAGE);
    const pagedCycles     = cycles.slice((cyclePage - 1)       * PER_PAGE, cyclePage      * PER_PAGE);
    const pagedProduction = stock.slice((productionPage - 1)   * PER_PAGE, productionPage * PER_PAGE);
    const pagedShipments  = shipments.slice((shipmentPage - 1) * PER_PAGE, shipmentPage   * PER_PAGE);

    const chartCard = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5";

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview',   label: 'Business Overview',  icon: BarChart3 },
        { id: 'farmers',    label: 'Farmers & Supply',   icon: Leaf      },
        { id: 'production', label: 'Production & Waste', icon: Package   },
        { id: 'export',     label: 'Export Performance', icon: Plane     },
    ];

    // ── Export XLSX ──
    const handleExportXLSX = () => {
        const wb   = XLSX.utils.book_new();
        const makeSheet = (headers: string[], rows: any[][]) => {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            ws['!cols'] = headers.map((h, i) => ({
                wch: Math.min(Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 4, 40)
            }));
            return ws;
        };

        if (activeTab === 'overview') {
            XLSX.utils.book_append_sheet(wb, makeSheet(['Metric', 'Value'], [
                ['Total Received (Tons)',  `${(totalReceived  / 1000).toFixed(1)}`],
                ['Total Processed (Tons)', `${(totalProcessed / 1000).toFixed(1)}`],
                ['Total Exported (Tons)',  `${(totalExportedKg / 1000).toFixed(1)}`],
                ['Loss Rate (%)',          lossRate],
                ['Active Farmers',         farmers.filter(f => f.status === 'Active').length],
                ['Crop Cycles',            cycles.length],
                ['Shipments',              shipments.length],
                ['Shipped',             shippedCount.length],
            ]), 'Overview');
        } else if (activeTab === 'farmers') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Full Name', 'Farm Name', 'Province', 'District', 'Produce', 'Farm Size (ha)', 'Status', 'Registered'],
                farmers.map(f => [f.full_name, f.farm_name || 'N/A', f.province || 'N/A', f.district, (f.produce_types || []).join(', '), f.farm_size_hectares, f.status, formatDate(f.createdAt)])
            ), 'Farmers');
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Cycle ID', 'Crop', 'Season', 'Status', 'Started'],
                cycles.map(c => [c.cycleId || String(c._id).slice(-8).toUpperCase(), c.crop_name || c.cropName || 'N/A', c.season || 'N/A', c.status, formatDate(c.createdAt)])
            ), 'Crop Cycles');
        } else if (activeTab === 'production') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Stock ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Loss %', 'Status', 'Date'],
                stock.map(b => {
                    const loss = b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0';
                    return [b.stockId || 'N/A', b.cropName || 'N/A', b.receivedWeightKg || 0, b.processedWeightKg || 0, b.rejectedWeightKg || 0, `${loss}%`, b.status, formatDate(b.updatedAt)];
                })
            ), 'Production');
        } else if (activeTab === 'export') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['PL Number', 'Flight', 'Destination', 'Client', 'Weight (kg)', 'Boxes', 'Status', 'Departure'],
                shipments.map(s => [s.plNumber || 'N/A', s.flightNumber || 'N/A', s.destination || 'N/A', s.clientName || 'N/A', s.totalWeightKg || 0, s.totalBoxes || 0, s.status, formatDate(s.departureDate)])
            ), 'Shipments');
        }

        const tabLabel = tabs.find(t => t.id === activeTab)?.label.replace(/\s/g, '_') || 'Report';
        XLSX.writeFile(wb, `FreshSarura_PM_${tabLabel}_${startDate}_to_${endDate}.xlsx`);
        setIsExportOpen(false);
    };

    // ── Export PDF ──
    const handleExportPDF = async () => {
        const doc       = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());
        const toTC      = (s: string) => s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // ── Helper: capture a chart by element id ──
        const captureChart = async (id: string): Promise<string | null> => {
            const el = document.getElementById(id);
            if (!el) return null;
            try {
                const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                return canvas.toDataURL('image/png');
            } catch { return null; }
        };

        // Header
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
        doc.setTextColor(21, 128, 61); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235); doc.line(15, 30, pageWidth - 15, 30);

        doc.setTextColor(17, 24, 39); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        const title = tabs.find(t => t.id === activeTab)?.label.toUpperCase() || 'REPORT';
        doc.text(`${title} — PM REPORT SUMMARY`, 15, 42);

        // ── Summary fields ──
        const summaryFields = activeTab === 'overview' ? [
            { label: 'Total Received',        value: `${(totalReceived  / 1000).toFixed(1)} Tons` },
            { label: 'Total Processed',       value: `${(totalProcessed / 1000).toFixed(1)} Tons` },
            { label: 'Total Exported',        value: `${(totalExportedKg / 1000).toFixed(1)} Tons` },
            { label: 'Loss Rate',             value: `${lossRate}%` },
            { label: 'Cold Room Stock',       value: `${(coldRoomStockKg / 1000).toFixed(1)} Tons` },
            { label: 'Active Farmers',        value: String(farmers.filter(f => f.status === 'Active' || f.status === 'active').length) },
            { label: 'Crop Cycles',           value: String(cycles.length) },
            { label: 'Shipped Shipments',  value: String(shippedCount.length) },
        ] : activeTab === 'farmers' ? [
            { label: 'Total Farmers',         value: String(farmers.length) },
            { label: 'Active Farmers',        value: String(farmers.filter(f => f.status === 'Active' || f.status === 'active').length) },
            { label: 'Crop Cycles',           value: String(cycles.length) },
            { label: 'Avg Farm Size',         value: farmers.length ? `${(farmers.reduce((s, f) => s + (f.farm_size_hectares || 0), 0) / farmers.length).toFixed(1)} ha` : '—' },
        ] : activeTab === 'production' ? [
            { label: 'Cold Room Stock',       value: `${(coldRoomStockKg / 1000).toFixed(1)} Tons` },
            { label: 'Total Processed',       value: `${totalProcessed.toLocaleString()} kg` },
            { label: 'Total Rejected',        value: `${totalRejected.toLocaleString()} kg` },
            { label: 'Loss Rate',             value: `${lossRate}%` },
        ] : activeTab === 'export' ? [
            { label: 'Total Shipments',       value: String(shipments.length) },
            { label: 'Shipped',            value: String(shippedCount.length) },
            { label: 'Total Exported',        value: `${(totalExportedKg / 1000).toFixed(2)} Tons` },
            { label: 'Avg Shipment Size',     value: shippedCount.length ? `${(totalExportedKg / shippedCount.length / 1000).toFixed(2)} Tons` : '—' },
        ] : [];

        let yPos = 52;
        doc.setFontSize(9);
        summaryFields.forEach(field => {
            doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
            doc.text(field.label, 15, yPos);
            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
            doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
            doc.setDrawColor(243, 244, 246);
            doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
            yPos += 10;
        });

        const headStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const bodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        // ── Capture chart ──
        const chartIdMap: Record<Tab, string[]> = {
            overview:   ['packhouse-chart', 'export-chart'],
            farmers:    [],
            production: ['production-chart'],
            export:     ['export-chart'],
        };
        const idsToCapture = chartIdMap[activeTab] || [];
        for (const id of idsToCapture) {
            const chartImg = await captureChart(id);
            if (chartImg) {
                if (yPos > 200) { doc.addPage(); yPos = 20; }
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text(`${id.split('-').join(' ').toUpperCase()}`, 15, yPos + 8);
                doc.addImage(chartImg, 'PNG', 15, yPos + 12, pageWidth - 30, 60);
                yPos += 80;
            }
        }

        // ── Data Table ──
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
        doc.text('DATA STREAM', 15, yPos + 10);

        if (activeTab === 'overview') {
            autoTable(doc, {
                startY: yPos + 15,
                head: [['METRIC', 'VALUE']],
                body: [
                    ['Total Received',         `${(totalReceived  / 1000).toFixed(1)} Tons`],
                    ['Total Processed',        `${(totalProcessed / 1000).toFixed(1)} Tons`],
                    ['Total Exported',         `${(totalExportedKg / 1000).toFixed(1)} Tons`],
                    ['Loss Rate',              `${lossRate}%`],
                    ['Cold Room Stock',        `${(coldRoomStockKg / 1000).toFixed(1)} Tons`],
                    ['Active Farmers',         String(farmers.filter(f => f.status === 'Active' || f.status === 'active').length)],
                    ['Crop Cycles',            String(cycles.length)],
                    ['Shipped Shipments',   String(shippedCount.length)],
                ],
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles, margin: { left: 15, right: 15, bottom: 30 },
            });
        } else if (activeTab === 'farmers') {
            autoTable(doc, {
                startY: yPos + 15,
                head: [['FULL NAME', 'DISTRICT', 'PRODUCE', 'FARM SIZE', 'STATUS', 'JOINED']],
                body: farmers.map(f => [toTC(f.full_name), toTC(f.district || 'N/A'), (f.produce_types || []).join(', '), `${f.farm_size_hectares} ha`, toTC(f.status || 'Active'), formatDate(f.createdAt)]),
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles, margin: { left: 15, right: 15, bottom: 30 },
            });
        } else if (activeTab === 'production') {
            autoTable(doc, {
                startY: yPos + 15,
                head: [['STOCK ID', 'CROP', 'RECEIVED (KG)', 'PROCESSED (KG)', 'LOSS %', 'STATUS', 'DATE']],
                body: stock.map(b => {
                    const loss = b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0';
                    return [b.stockId || '—', toTC(b.cropName || '—'), (b.receivedWeightKg || 0).toLocaleString(), (b.processedWeightKg || 0).toLocaleString(), `${loss}%`, toTC(b.status || '—'), formatDate(b.updatedAt)];
                }),
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles, margin: { left: 15, right: 15, bottom: 30 },
            });
        } else if (activeTab === 'export') {
            autoTable(doc, {
                startY: yPos + 15,
                head: [['PL NUMBER', 'FLIGHT', 'DESTINATION', 'CLIENT', 'WEIGHT (KG)', 'STATUS', 'DEPARTURE']],
                body: shipments.map(s => [s.plNumber || '—', s.flightNumber || '—', toTC(s.destination || '—'), toTC(s.clientName || '—'), (s.totalWeightKg || 0).toLocaleString(), toTC(s.status || '—'), formatDate(s.departureDate)]),
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles, margin: { left: 15, right: 15, bottom: 30 },
            });
        }

        // System Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report aggregates analytical data across Fresh Sarura modules.', 15, lastY + 25);
        
        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
            doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const footerY = 288;
            doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, footerY, { align: 'right' });
        }

        const tabLabel = tabs.find(t => t.id === activeTab)?.label.replace(/\s/g, '_') || 'Report';
        doc.save(`FreshSarura_PM_${tabLabel}_${startDate}_to_${endDate}.pdf`);
        setIsExportOpen(false);
    };

    return (
        <div className="p-6 space-y-6 pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reporting</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Business health monitor — your operations at a glance</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
                        <Calendar size={15} className="text-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 font-medium">From:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer" />
                        <span className="text-xs text-gray-400 font-medium ml-2">To:</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer" />
                        
                        <button
                            onClick={() => {
                                const d = new Date(); d.setMonth(d.getMonth() - 3);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="ml-2 text-xs text-green-600 hover:text-green-700 font-bold transition-colors whitespace-nowrap"
                        >
                            Clear
                        </button>
                    </div>
                    {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}

                    {/* Export dropdown */}
                    <div className="relative">
                        <button onClick={() => onPage(page - 1)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                            <Download size={15} /> Export Data
                            
                        </button>
                        
                    </div>
                </div>
            </div>
            </div>
            
            {/* ── Tab Navigation ── */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-0 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    active ? 'border-green-600 text-green-700 dark:text-green-400'
                                           : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}>
                                <Icon size={15} />{tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                TAB 1 — BUSINESS OVERVIEW
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Received"   value={`${(totalReceived  / 1000).toFixed(1)} Tons`}    icon={Package}      iconBg="bg-blue-50 text-blue-600"    trend="neutral" trendLabel="Raw intake this period" />
                        <KpiCard label="Total Processed"  value={`${(totalProcessed / 1000).toFixed(1)} Tons`}   icon={BarChart3}    iconBg="bg-green-50 text-green-600"  trend="neutral" trendLabel="After packhouse" />
                        <KpiCard label="Loss Rate"        value={`${lossRate}%`}                                  icon={TrendingDown} iconBg="bg-red-50 text-red-500"      trend={parseFloat(lossRate) > 10 ? 'down' : 'up'} trendLabel={parseFloat(lossRate) > 10 ? 'Above target' : 'Within target'} />
                        <KpiCard label="Total Exported"   value={`${(totalExportedKg / 1000).toFixed(1)} Tons`}  icon={Plane}        iconBg="bg-purple-50 text-purple-600" trend="up"      trendLabel={`${shippedCount.length} shipped`} />
                        <KpiCard label="Active Farmers"   value={String(farmers.filter(f => f.status === 'Active').length)} icon={Leaf} iconBg="bg-emerald-50 text-emerald-600" trend="neutral" trendLabel="Supplying this season" />
                        <KpiCard label="Crop Cycles"      value={String(cycles.length)}                           icon={Leaf}         iconBg="bg-teal-50 text-teal-600"     trend="neutral" trendLabel="In selected period" />
                        
                        {/* Unified Cold Room Stock Card */}
                        <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${
                            fullyDepletedCount > 0 ? 'border-red-200 dark:border-red-900/40' : 
                            nearlyEmptyCount > 0 ? 'border-amber-200 dark:border-amber-900/40' : 
                            'border-gray-100 dark:border-gray-700 shadow-sm'
                        }`}>
                            <div className="flex items-start justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cold Room Stock</p>
                                <div className={`p-2 rounded-xl ${
                                    fullyDepletedCount > 0 ? 'bg-red-50 text-red-600' :
                                    nearlyEmptyCount > 0 ? 'bg-amber-50 text-amber-600' :
                                    'bg-cyan-50 text-cyan-600'
                                }`}>
                                    <Package size={18} className="opacity-80" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {(coldRoomStockKg / 1000).toFixed(1)} Tons
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Available only</p>
                            </div>
                            
                            {(fullyDepletedCount > 0 || nearlyEmptyCount > 0) && (
                                <div className="space-y-1">
                                    {fullyDepletedCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            {fullyDepletedCount} item{fullyDepletedCount > 1 ? 's' : ''} depleted
                                        </div>
                                    )}
                                    {nearlyEmptyCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            {nearlyEmptyCount} item{nearlyEmptyCount > 1 ? 's' : ''} nearly empty
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <KpiCard label="Shipments"        value={String(shipments.length)}                        icon={Plane}        iconBg="bg-amber-50 text-amber-600"   trend="neutral" trendLabel="In selected period" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={chartCard}>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Packhouse Activity</h2>
                            <p className="text-xs text-gray-400 mb-4">Received vs Processed vs Rejected (kg)</p>
                            {monthlyStockData.length === 0
                                ? <p className="text-sm text-gray-400 py-8 text-center">No packhouse data in this period.</p>
                                : <div id="packhouse-chart" className="w-full h-[240px] bg-white dark:bg-gray-800">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyStockData} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar dataKey="received"  fill="#3b82f6" radius={[4,4,0,0]} name="Received" />
                                            <Bar dataKey="processed" fill="#22c55e" radius={[4,4,0,0]} name="Processed" />
                                            <Bar dataKey="rejected"  fill="#ef4444" radius={[4,4,0,0]} name="Rejected" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            }
                        </div>
                        <div className={chartCard}>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Export Volume Over Time</h2>
                            <p className="text-xs text-gray-400 mb-4">Shipment count and weight in Tons</p>
                            {monthlyShipmentData.length === 0
                                ? <p className="text-sm text-gray-400 py-8 text-center">No shipment data in this period.</p>
                                : <div id="export-chart" className="w-full h-[240px] bg-white dark:bg-gray-800">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlyShipmentData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Line type="monotone" dataKey="weightTons" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Weight (Tons)" />
                                            <Line type="monotone" dataKey="shipments"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Shipments Count" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2 — FARMERS & SUPPLY
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'farmers' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Farmers"  value={String(farmers.length)} icon={Leaf} iconBg="bg-green-50 text-green-600" trend="neutral" trendLabel="Registered on platform" />
                        <KpiCard label="Active Farmers" value={String(farmers.filter(f => f.status === 'Active').length)} icon={Leaf} iconBg="bg-emerald-50 text-emerald-600" trend="up" trendLabel="Currently supplying" />
                        <KpiCard label="Crop Cycles"    value={String(cycles.length)} icon={BarChart3} iconBg="bg-teal-50 text-teal-600" trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Avg Farm Size"  value={farmers.length ? `${(farmers.reduce((s, f) => s + (f.farm_size_hectares || 0), 0) / farmers.length).toFixed(1)} ha` : '—'} icon={Package} iconBg="bg-blue-50 text-blue-600" trend="neutral" trendLabel="Per registered farmer" />
                    </div>
                    <TableShell title="Registered Farmers"
                        headers={['Full Name', 'Farm Name', 'Province', 'District', 'Produce', 'Farm Size (ha)', 'Status', 'Registered']}
                        total={farmers.length} page={farmerPage} perPage={PER_PAGE} onPage={setFarmerPage}>
                        {pagedFarmers.length === 0 ? <EmptyRow cols={8} msg="No farmers registered." /> :
                            pagedFarmers.map(f => (
                                <tr key={f._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{f.full_name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.farm_name || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.province || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.district}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{(f.produce_types || []).join(', ')}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.farm_size_hectares}</td>
                                    <td className="px-4 py-3"><Badge status={f.status} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(f.createdAt)}</td>
                                </tr>
                            ))}
                    </TableShell>
                    <TableShell title="Crop Cycles"
                        headers={['Cycle ID', 'Crop', 'Season', 'Status', 'Started']}
                        total={cycles.length} page={cyclePage} perPage={PER_PAGE} onPage={setCyclePage}>
                        {pagedCycles.length === 0 ? <EmptyRow cols={5} /> :
                            pagedCycles.map(c => (
                                <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.cycleId || String(c._id).slice(-8).toUpperCase()}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.crop_name || c.cropName || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.season || '—'}</td>
                                    <td className="px-4 py-3"><Badge status={c.status || 'active'} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                                </tr>
                            ))}
                    </TableShell>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 3 — PRODUCTION & WASTE
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'production' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Cold Room Stock"  value={`${(coldRoomStockKg / 1000).toFixed(1)} Tons`} icon={Thermometer}  iconBg="bg-cyan-50 text-cyan-600"    trend="neutral" trendLabel="Available in storage" />
                        <KpiCard label="Total Processed"  value={`${totalProcessed.toLocaleString()} kg`}       icon={BarChart3}    iconBg="bg-green-50 text-green-600"  trend="neutral" trendLabel="After packhouse" />
                        <KpiCard label="Total Rejected"   value={`${totalRejected.toLocaleString()} kg`}        icon={TrendingDown} iconBg="bg-red-50 text-red-500"      trend="down"    trendLabel="Failed QC" />
                        <KpiCard label="Loss Rate"        value={`${lossRate}%`}                                 icon={TrendingDown} iconBg="bg-amber-50 text-amber-600"  trend={parseFloat(lossRate) > 10 ? 'down' : 'up'} trendLabel={parseFloat(lossRate) > 10 ? 'Above threshold' : 'Within target'} />
                    </div>
                    <div className={chartCard}>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Monthly Packhouse Activity</h2>
                        <p className="text-xs text-gray-400 mb-4">Received vs Processed vs Rejected (kg)</p>
                        {monthlyStockData.length === 0
                            ? <p className="text-sm text-gray-400 py-8 text-center">No data in this period.</p>
                            : <div id="production-chart" className="w-full h-[220px] bg-white dark:bg-gray-800">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyStockData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="received"  fill="#3b82f6" radius={[4,4,0,0]} name="Received" />
                                        <Bar dataKey="processed" fill="#22c55e" radius={[4,4,0,0]} name="Processed" />
                                        <Bar dataKey="rejected"  fill="#ef4444" radius={[4,4,0,0]} name="Rejected" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        }
                    </div>
                    <TableShell title="Processing Batches"
                        headers={['Stock ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Loss %', 'Status', 'Date']}
                        total={stock.length} page={productionPage} perPage={PER_PAGE} onPage={setProductionPage}>
                        {pagedProduction.length === 0 ? <EmptyRow cols={8} /> :
                            pagedProduction.map(b => {
                                const loss = b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{b.stockId || '—'}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.cropName || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(b.receivedWeightKg || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(b.processedWeightKg || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(b.rejectedWeightKg || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3"><span className={`text-xs font-bold ${parseFloat(loss) > 15 ? 'text-red-600' : 'text-green-600'}`}>{loss}%</span></td>
                                        <td className="px-4 py-3"><Badge status={b.status} /></td>
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(b.updatedAt)}</td>
                                    </tr>
                                );
                            })}
                    </TableShell>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 4 — EXPORT PERFORMANCE
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'export' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Shipments"    value={String(shipments.length)}                         icon={Plane}    iconBg="bg-blue-50 text-blue-600"    trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Shipped"         value={String(shippedCount.length)}                        icon={Plane}    iconBg="bg-green-50 text-green-600"  trend="up"      trendLabel="Successfully sent" />
                        <KpiCard label="Total Exported"     value={`${(totalExportedKg / 1000).toFixed(2)} Tons`}   icon={Package}  iconBg="bg-purple-50 text-purple-600" trend="up"      trendLabel="Weight shipped" />
                        <KpiCard label="Avg Shipment Size"  value={shippedCount.length ? `${(totalExportedKg / shippedCount.length / 1000).toFixed(2)} Tons` : '—'} icon={BarChart3} iconBg="bg-amber-50 text-amber-600" trend="neutral" trendLabel="Per shipped shipment" />
                    </div>
                    <div className={chartCard}>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Export Volume Over Time</h2>
                        <p className="text-xs text-gray-400 mb-4">Shipment count and weight in Tons</p>
                        {monthlyShipmentData.length === 0
                            ? <p className="text-sm text-gray-400 py-8 text-center">No shipment data in this period.</p>
                            : <div id="export-chart" className="w-full h-[220px] bg-white dark:bg-gray-800">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyShipmentData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line type="monotone" dataKey="weightTons" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Weight (Tons)" />
                                        <Line type="monotone" dataKey="shipments"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Shipments Count" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        }
                    </div>
                    <TableShell title="All Shipments in Period"
                        headers={['PL Number', 'Flight', 'Destination', 'Client', 'Weight (kg)', 'Boxes', 'Status', 'Departure']}
                        total={shipments.length} page={shipmentPage} perPage={PER_PAGE} onPage={setShipmentPage}>
                        {pagedShipments.length === 0 ? <EmptyRow cols={8} /> :
                            pagedShipments.map(s => (
                                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{s.plNumber || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.flightNumber || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.destination || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.clientName || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{(s.totalWeightKg || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.totalBoxes || 0}</td>
                                    <td className="px-4 py-3"><Badge status={s.status} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(s.departureDate)}</td>
                                </tr>
                            ))}
                    </TableShell>
                </div>
            )}
        </div>
    );
};

export default AnalyticsReporting;
