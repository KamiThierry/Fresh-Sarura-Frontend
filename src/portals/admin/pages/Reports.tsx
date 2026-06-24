import { useState, useEffect, useMemo } from 'react'; // Analytics & Reports Page
import {
    BarChart3, Download, Calendar, Users,
    Package, Plane, Leaf, TrendingUp, TrendingDown,
    Minus, Thermometer, ChevronDown, FileSpreadsheet, FileText
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { api } from '@/lib/api';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
type Tab = 'overview' | 'farmers' | 'production' | 'export' | 'users';

// ─── Pagination ───────────────────────────────────────────────────
const Pagination = ({ total, page, perPage, onChange }: {
    total: number; page: number; perPage: number; onChange: (p: number) => void;
}) => {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400">
                Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
            </span>
            <div className="flex gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p); return acc;
                    }, [])
                    .map((p, i) => p === '...'
                        ? <span key={`e-${i}`} className="px-2 py-1.5 text-xs text-gray-400">…</span>
                        : <button key={p} onClick={() => onChange(p as number)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${page === p ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            {p}
                          </button>
                    )}
                <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / perPage)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Next →
                </button>
            </div>
        </div>
    );
};

// ─── Badge ────────────────────────────────────────────────────────
const Badge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        Dispatched:           'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        PackingListGenerated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        Draft:                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        Done:                 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        Processing:           'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        RoomRequested:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        Active:               'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        active:               'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        in_progress:          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse',
        completed:            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        Inactive:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        Auditing:             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
        </span>
    );
};

// ─── Table Shell ──────────────────────────────────────────────────
const TableShell = ({ title, headers, children, total, page, perPage, onPage }: {
    title: string; headers: string[]; children: React.ReactNode;
    total: number; page: number; perPage: number; onPage: (p: number) => void;
}) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/40">
                        {headers.map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">{children}</tbody>
            </table>
        </div>
        <Pagination total={total} page={page} perPage={perPage} onChange={onPage} />
    </div>
);

// ─── KPI Card (image 2 style) ─────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, iconBg, trend, trendLabel }: {
    label: string;
    value: string;
    icon: React.ElementType;
    iconBg: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
}) => {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon size={18} className="opacity-80" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
            {trendLabel && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                    <TrendIcon size={13} />
                    <span>{trendLabel}</span>
                </div>
            )}
        </div>
    );
};

// ─── Empty Row ────────────────────────────────────────────────────
const EmptyRow = ({ cols, msg = 'No data in this period.' }: { cols: number; msg?: string }) => (
    <tr><td colSpan={cols} className="py-10 text-center text-gray-400 text-sm">{msg}</td></tr>
);

const PER_PAGE = 8;

// ═══════════════════════════════════════════════════════════════════
const Reports = () => {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate]       = useState(() => new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab]   = useState<Tab>('overview');
    const [farmerPage,     setFarmerPage]     = useState(1);
    const [cyclePage,      setCyclePage]      = useState(1);
    const [productionPage, setProductionPage] = useState(1);
    const [shipmentPage,   setShipmentPage]   = useState(1);
    const [userPage,       setUserPage]       = useState(1);
    const [stock,     setStock]     = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);
    const [users,     setUsers]     = useState<any[]>([]);
    const [farmers,   setFarmers]   = useState<any[]>([]);
    const [cycles,    setCycles]    = useState<any[]>([]);
    const [harvestDeclarations, setHarvestDeclarations] = useState<any[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [isExportOpen, setIsExportOpen] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const q = `?startDate=${startDate}&endDate=${endDate}`;
                const [stockRes, shipmentsRes, usersRes, farmersRes, cyclesRes, harvestRes] = await Promise.all([
                    api.get(`/stock${q}`), api.get(`/shipments${q}`), api.get(`/auth/users${q}`),
                    api.get(`/farmers${q}`), api.get(`/crop-cycles${q}`), api.get(`/harvest-declarations`),
                ]);
                setStock(stockRes.data?.data         ?? stockRes?.data         ?? []);
                setShipments(shipmentsRes.data?.data ?? shipmentsRes?.data     ?? []);
                setUsers(usersRes.data?.data          ?? usersRes?.data        ?? []);
                setFarmers(farmersRes.farmers         ?? farmersRes.data?.farmers ?? farmersRes.data ?? []);
                setCycles(cyclesRes.data?.data        ?? cyclesRes?.data       ?? []);
                setHarvestDeclarations(harvestRes.data?.data ?? harvestRes.data ?? []);
            } catch (err) {
                console.error('Failed to fetch report data', err);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, [startDate, endDate]);

    const inRange = (dateStr: string) => {
        const d = new Date(dateStr);
        return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59');
    };

    const filteredStock     = useMemo(() => stock.filter(b     => inRange(b.updatedAt)),   [stock,     startDate, endDate]);
    const filteredShipments = useMemo(() => shipments.filter(s => inRange(s.createdAt)),   [shipments, startDate, endDate]);
    const filteredCycles    = useMemo(() => cycles.filter(c    => inRange(c.createdAt)),   [cycles,    startDate, endDate]);

    const totalReceived   = filteredStock.reduce((s, b) => s + (b.receivedWeightKg  || 0), 0);
    const totalProcessed  = filteredStock.reduce((s, b) => s + (b.processedWeightKg || 0), 0);
    const totalRejected   = filteredStock.reduce((s, b) => s + (b.rejectedWeightKg  || 0), 0);
    const coldRoomStockKg = filteredStock.reduce((s, b) => s + ((b.processedWeightKg || 0) - (b.rejectedWeightKg || 0)), 0);
    const lossRate        = totalReceived > 0 ? ((totalRejected / totalReceived) * 100).toFixed(1) : '0';
    const dispatched      = filteredShipments.filter(s => s.status === 'Dispatched');
    const totalExportedKg = dispatched.reduce((s, sh) => s + (sh.totalWeightKg || 0), 0);

    const monthlyStockData = useMemo(() => {
        const map: Record<string, any> = {};
        filteredStock.forEach(b => {
            const date = new Date(b.updatedAt);
            const month = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            if (!map[month]) map[month] = { month, received: 0, processed: 0, rejected: 0 };
            map[month].received  += b.receivedWeightKg  || 0;
            map[month].processed += b.processedWeightKg || 0;
            map[month].rejected  += b.rejectedWeightKg  || 0;
        });
        return Object.values(map).slice(-6);
    }, [filteredStock]);

    const monthlyShipmentData = useMemo(() => {
        const map: Record<string, any> = {};
        filteredShipments.forEach(s => {
            const month = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!map[month]) map[month] = { month, shipments: 0, weightTons: 0 };
            map[month].shipments  += 1;
            map[month].weightTons += parseFloat(((s.totalWeightKg || 0) / 1000).toFixed(2));
        });
        return Object.values(map).slice(-6);
    }, [filteredShipments]);

    const roleData = useMemo(() => {
        const map: Record<string, number> = {};
        users.forEach(u => { map[u.role] = (map[u.role] || 0) + 1; });
        return Object.entries(map).map(([role, count]) => ({ role: role.replace(/_/g, ' '), count }));
    }, [users]);

    const pagedFarmers    = farmers.slice((farmerPage - 1)     * PER_PAGE, farmerPage     * PER_PAGE);
    const pagedCycles     = filteredCycles.slice((cyclePage - 1) * PER_PAGE, cyclePage    * PER_PAGE);
    const pagedProduction = filteredStock.slice((productionPage - 1) * PER_PAGE, productionPage * PER_PAGE);
    const pagedShipments  = filteredShipments.slice((shipmentPage - 1) * PER_PAGE, shipmentPage * PER_PAGE);
    const pagedUsers      = users.slice((userPage - 1) * PER_PAGE, userPage * PER_PAGE);

    const handleExportXLSX = () => {
        const tabLabel = tabs.find(t => t.id === activeTab)?.label || 'Report';
        const wb = XLSX.utils.book_new();

        // ── Helper: create a styled worksheet from headers + rows ──
        const makeSheet = (headers: string[], rows: (string | number)[][]) => {
            const data = [headers, ...rows];
            const ws   = XLSX.utils.aoa_to_sheet(data);

            // Column widths — set each column to fit content
            ws['!cols'] = headers.map((h, i) => {
                const maxLen = Math.max(
                    h.length,
                    ...rows.map(r => String(r[i] ?? '').length)
                );
                return { wch: Math.min(maxLen + 4, 40) }; // max 40 chars wide
            });

            // Freeze first row (header)
            ws['!freeze'] = { xSplit: 0, ySplit: 1 };

            return ws;
        };

        if (activeTab === 'overview') {
            const ws = makeSheet(
                ['Metric', 'Value'],
                [
                    ['Total Received (Tons)',    `${(totalReceived  / 1000).toFixed(1)}`],
                    ['Total Processed (Tons)',   `${(totalProcessed / 1000).toFixed(1)}`],
                    ['Total Exported (Tons)',    `${(totalExportedKg / 1000).toFixed(1)}`],
                    ['Loss Rate (%)',            lossRate],
                    ['Dispatched Shipments',     dispatched.length],
                    ['Total Shipments',          filteredShipments.length],
                    ['Registered Farmers',       farmers.length],
                    ['Active Farmers',           farmers.filter(f => f.status === 'Active' || f.status === 'active').length],
                    ['Crop Cycles in Period',    filteredCycles.length],
                    ['Production Batches',       filteredStock.length],
                    ['Total Users',              users.length],
                ]
            );
            XLSX.utils.book_append_sheet(wb, ws, 'Overview');
        }

        else if (activeTab === 'farmers') {
            // Sheet 1 — Farmers
            const farmerWs = makeSheet(
                ['Full Name', 'Farm Name', 'National ID', 'Phone', 'Email', 'District', 'Sector', 'Cell', 'Village', 'Produce Types', 'Farm Size (ha)', 'Capacity (Tons)', 'Status', 'Registered'],
                farmers.map(f => [
                    f.full_name,
                    f.farm_name                || 'Individual',
                    f.national_id              || 'N/A',
                    String(f.phone             || 'N/A'),
                    f.email                    || 'N/A',
                    f.district                 || 'N/A',
                    f.sector                   || 'N/A',
                    f.cell                     || 'N/A',
                    f.village                  || 'N/A',
                    (f.produce_types || []).join(', '),
                    f.farm_size_hectares       || 0,
                    f.production_capacity_tons || 0,
                    f.status                   || 'Active',
                    formatDate(f.created_at || ''),
                ])
            );
            XLSX.utils.book_append_sheet(wb, farmerWs, 'Farmers');

            // Sheet 2 — Crop Cycles
            const cycleWs = makeSheet(
                ['Cycle ID', 'Crop Name', 'Season', 'Status', 'Start Date'],
                filteredCycles.map(c => [
                    String(c._id).slice(-8).toUpperCase(),
                    c.crop_name || 'N/A',
                    c.season                   || 'N/A',
                    c.status                   || 'N/A',
                    formatDate(c.start_date || ''),
                ])
            );
            XLSX.utils.book_append_sheet(wb, cycleWs, 'Crop Cycles');
        }

        else if (activeTab === 'production') {
            const ws = makeSheet(
                ['Stock ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Loss %', 'Room', 'Status', 'Date'],
                filteredStock.map(b => {
                    const loss = b.receivedWeightKg > 0
                        ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0';
                    return [
                        b.stockId           || 'N/A',
                        b.cropName          || 'N/A',
                        b.receivedWeightKg  || 0,
                        b.processedWeightKg || 0,
                        b.rejectedWeightKg  || 0,
                        `${loss}%`,
                        b.assignedRoom      || 'N/A',
                        b.status            || 'N/A',
                        formatDate(b.updatedAt),
                    ];
                })
            );
            XLSX.utils.book_append_sheet(wb, ws, 'Production & QC');
        }

        else if (activeTab === 'export') {
            const ws = makeSheet(
                ['PL Number', 'Flight', 'Airline', 'Destination', 'Client', 'Weight (kg)', 'Boxes', 'AWB Number', 'Invoice', 'Status', 'Departure Date'],
                filteredShipments.map(s => [
                    s.plNumber       || 'N/A',
                    s.flightNumber   || 'N/A',
                    s.airlineCode    || 'N/A',
                    s.destination    || 'N/A',
                    s.clientName     || 'N/A',
                    s.totalWeightKg  || 0,
                    s.totalBoxes     || 0,
                    s.awbNumber      || 'N/A',
                    s.invoiceNumber  || 'N/A',
                    s.status         || 'N/A',
                    s.departureDate  ? formatDate(s.departureDate) : 'N/A',
                ])
            );
            XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
        }

        else if (activeTab === 'users') {
            const ws = makeSheet(
                ['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined'],
                users.map(u => [
                    u.name  || 'N/A',
                    u.email || 'N/A',
                    (u.role || '').replace(/_/g, ' '),
                    String(u.phone || 'N/A'), // string → no scientific notation
                    u.isActive ? 'Active' : 'Inactive',
                    formatDate(u.createdAt),
                ])
            );
            XLSX.utils.book_append_sheet(wb, ws, 'Users');
        }

        XLSX.writeFile(wb, `FreshSarura_${tabLabel.replace(/\s/g, '_')}_Report_${startDate}_to_${endDate}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

        const toTitleCase = (str: string) =>
            str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // ── Helper: capture a chart by element id ──
        const captureChart = async (id: string): Promise<string | null> => {
            const el = document.getElementById(id);
            if (!el) return null;
            try {
                const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                return canvas.toDataURL('image/png');
            } catch { return null; }
        };

        // ── 1. Header ──
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.line(15, 30, pageWidth - 15, 30);

        // ── 2. Report Title ──
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        const reportTitle = tabs.find(t => t.id === activeTab)?.label.toUpperCase() || 'ANALYTICS';
        doc.text(`${reportTitle} REPORT SUMMARY`, 15, 42);

        // ── 3. Tab-specific summary fields ──
        const summaryFields: { label: string; value: string }[] =
            activeTab === 'overview' ? [
                { label: 'Total Received',        value: `${(totalReceived  / 1000).toFixed(1)} Tons` },
                { label: 'Total Processed',       value: `${(totalProcessed / 1000).toFixed(1)} Tons` },
                { label: 'Total Exported',        value: `${(totalExportedKg / 1000).toFixed(1)} Tons` },
                { label: 'Loss Rate',             value: `${lossRate}%` },
                { label: 'Dispatched Shipments',  value: String(dispatched.length) },
                { label: 'Registered Farmers',    value: String(farmers.length) },
                { label: 'Crop Cycles in Period', value: String(filteredCycles.length) },
                { label: 'Total Users',           value: String(users.length) },
            ]
            : activeTab === 'farmers' ? [
                { label: 'Total Registered Farmers', value: String(farmers.length) },
                { label: 'Active Farmers',           value: String(farmers.filter(f => f.status === 'Active' || f.status === 'active').length) },
                { label: 'Avg Farm Size',            value: farmers.length ? `${(farmers.reduce((s, f) => s + (f.farm_size_hectares || 0), 0) / farmers.length).toFixed(1)} ha` : '0 ha' },
            ]
            : activeTab === 'production' ? [
                { label: 'Total Intake (kg)',     value: totalReceived.toLocaleString() },
                { label: 'Total Processed (kg)', value: totalProcessed.toLocaleString() },
                { label: 'Total Rejected (kg)',  value: totalRejected.toLocaleString() },
                { label: 'Loss Rate',            value: `${lossRate}%` },
                { label: 'Production Batches',   value: String(filteredStock.length) },
            ]
            : activeTab === 'export' ? [
                { label: 'Total Shipments',      value: String(filteredShipments.length) },
                { label: 'Dispatched',           value: String(dispatched.length) },
                { label: 'Total Exported (Tons)', value: `${(totalExportedKg / 1000).toFixed(2)} Tons` },
                { label: 'Avg Shipment Size',    value: dispatched.length ? `${(totalExportedKg / dispatched.length / 1000).toFixed(2)} Tons` : '—' },
            ]
            : activeTab === 'users' ? [
                { label: 'Total Users',       value: String(users.length) },
                { label: 'Active Users',      value: String(users.filter(u => u.isActive).length) },
                { label: 'Pending Approval',  value: String(users.filter(u => !u.isActive).length) },
                { label: 'Admins',            value: String(users.filter(u => u.role === 'admin').length) },
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

        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        // ── 4. Capture chart for current tab ──
        const chartIdMap: Record<Tab, string> = {
            overview:   'packhouse-chart',
            farmers:    '',
            production: 'production-chart',
            export:     'export-chart',
            users:      'user-role-chart',
        };
        const chartImg = chartIdMap[activeTab] ? await captureChart(chartIdMap[activeTab]) : null;

        // ── 5. Tab-specific table ──
        if (activeTab === 'overview') {
            if (chartImg) {
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text('PACKHOUSE ACTIVITY CHART', 15, yPos + 8);
                doc.addImage(chartImg, 'PNG', 15, yPos + 12, pageWidth - 30, 55);
                yPos += 75;
            }
            const shipmentsImg = await captureChart('shipments-chart');
            if (shipmentsImg) {
                doc.text('EXPORT SHIPMENTS CHART', 15, yPos + 8);
                doc.addImage(shipmentsImg, 'PNG', 15, yPos + 12, pageWidth - 30, 55);
                yPos += 75;
            }
            // Platform Overview Table
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
            doc.text('PLATFORM OVERVIEW', 15, yPos + 10);
            autoTable(doc, {
                startY: yPos + 15,
                head: [['METRIC', 'VALUE']],
                body: [
                    ['Total Received',          `${(totalReceived  / 1000).toFixed(1)} Tons`],
                    ['Total Processed',         `${(totalProcessed / 1000).toFixed(1)} Tons`],
                    ['Total Rejected',          `${totalRejected.toLocaleString()} kg`],
                    ['Loss Rate',               `${lossRate}%`],
                    ['Total Exported',          `${(totalExportedKg / 1000).toFixed(1)} Tons`],
                    ['Dispatched Shipments',    String(dispatched.length)],
                    ['Total Shipments',         String(filteredShipments.length)],
                    ['Registered Farmers',      String(farmers.length)],
                    ['Active Farmers',          String(farmers.filter(f => f.status === 'Active').length)],
                    ['Crop Cycles in Period',   String(filteredCycles.length)],
                    ['Production Batches',      String(filteredStock.length)],
                    ['Total Users',             String(users.length)],
                ],
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });

        } else if (activeTab === 'farmers') {
            // ── Top Suppliers Section ──
            const topSuppliers = farmers
                .map((f) => ({
                    name: f.full_name,
                    farm: f.farm_name || 'Individual',
                    totalKg: harvestDeclarations
                        .filter((d: any) => {
                            const fid = d.farmerId?._id ?? d.farmerId;
                            return String(fid) === String(f._id);
                        })
                        .reduce((s: number, d: any) => s + (d.estimatedWeightKg || 0), 0),
                }))
                .sort((a, b) => b.totalKg - a.totalKg)
                .slice(0, 4);

            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
            doc.text('TOP SUPPLIERS BY VOLUME', 15, yPos + 10);
            
            autoTable(doc, {
                startY: yPos + 15,
                head: [['RANK', 'FARMER', 'FARM NAME', 'TOTAL VOLUME']],
                body: topSuppliers.map((s, i) => [
                    `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`,
                    toTitleCase(s.name),
                    toTitleCase(s.farm),
                    s.totalKg >= 1000 ? `${(s.totalKg / 1000).toFixed(2)} T` : `${s.totalKg} kg`
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15 },
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;

            // ── Registered Farmers Table ──
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
            doc.text('REGISTERED FARMERS', 15, yPos);
            autoTable(doc, {
                startY: yPos + 5,
                head: [['FARMER / FARM', 'NATIONAL ID', 'CONTACT INFO', 'PHYSICAL ADDRESS', 'MAIN CROP', 'SIZE', 'STATUS']],
                body: farmers.map(f => [
                    `${toTitleCase(f.full_name)}\n${toTitleCase(f.farm_name || 'Individual')}`,
                    f.national_id || 'N/A',
                    `${f.phone || 'N/A'}\n${f.email || 'N/A'}`,
                    `${toTitleCase(f.district)}, ${toTitleCase(f.sector)}\nCell: ${toTitleCase(f.cell)}, Village: ${toTitleCase(f.village)}`,
                    (f.produce_types || []).join(', '),
                    `${f.farm_size_hectares || 0} ha`,
                    toTitleCase(f.status || 'Active')
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 6) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'active')   data.cell.styles.textColor = '#16a34a';
                        else if (s === 'inactive') data.cell.styles.textColor = '#dc2626';
                        else if (s === 'auditing') data.cell.styles.textColor = '#ea580c';
                    }
                }
            });
            let nextY = (doc as any).lastAutoTable.finalY + 15;
            if (nextY > 240) { doc.addPage(); nextY = 20; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('CROP CYCLES OVERVIEW', 15, nextY);
            autoTable(doc, {
                startY: nextY + 5,
                head: [['CYCLE ID', 'CROP', 'SEASON', 'STATUS', 'START DATE']],
                body: filteredCycles.map(c => [
                    String(c._id).slice(-8).toUpperCase(),
                    toTitleCase(c.crop_name || 'N/A'),
                    (c.season || 'N/A').toUpperCase(),
                    toTitleCase(c.status || 'Active'),
                    formatDate(c.start_date || '')
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'active')           data.cell.styles.textColor = '#16a34a';
                        else if (s === 'harvesting')  data.cell.styles.textColor = '#f59e0b';
                        else if (s === 'completed')   data.cell.styles.textColor = '#6b7280';
                    }
                }
            });

        } else if (activeTab === 'production') {
            if (chartImg) {
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text('MONTHLY PACKHOUSE ACTIVITY', 15, yPos + 8);
                doc.addImage(chartImg, 'PNG', 15, yPos + 12, pageWidth - 30, 55);
                yPos += 75;
            }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('PROCESSING BATCHES', 15, yPos + 10);
            autoTable(doc, {
                startY: yPos + 15,
                head: [['STOCK ID', 'CROP', 'RECEIVED (KG)', 'PROCESSED (KG)', 'LOSS %', 'STATUS', 'DATE']],
                body: filteredStock.map(b => {
                    const loss = b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0';
                    return [b.stockId || '—', toTitleCase(b.cropName || '—'),
                        (b.receivedWeightKg || 0).toLocaleString(), (b.processedWeightKg || 0).toLocaleString(),
                        `${loss}%`, toTitleCase(b.status || '—'), formatDate(b.updatedAt)];
                }),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'processed')       data.cell.styles.textColor = '#16a34a';
                        else if (s === 'rejected')   data.cell.styles.textColor = '#dc2626';
                        else if (s === 'pending')    data.cell.styles.textColor = '#ea580c';
                    }
                }
            });

        } else if (activeTab === 'export') {
            if (chartImg) {
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text('EXPORT VOLUME OVER TIME', 15, yPos + 8);
                doc.addImage(chartImg, 'PNG', 15, yPos + 12, pageWidth - 30, 55);
                yPos += 75;
            }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('EXPORT SHIPMENTS', 15, yPos + 10);
            autoTable(doc, {
                startY: yPos + 15,
                head: [['PL NUMBER', 'FLIGHT', 'DESTINATION', 'CLIENT', 'WEIGHT (KG)', 'STATUS', 'DEPARTURE']],
                body: filteredShipments.map(s => [
                    s.plNumber || '—', s.flightNumber || '—',
                    toTitleCase(s.destination || '—'), toTitleCase(s.clientName || '—'),
                    (s.totalWeightKg || 0).toLocaleString(), toTitleCase(s.status || '—'),
                    s.departureDate ? formatDate(s.departureDate) : '—'
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'dispatched') data.cell.styles.textColor = '#16a34a';
                    }
                }
            });

        } else if (activeTab === 'users') {
            if (chartImg) {
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                doc.text('USER DISTRIBUTION BY ROLE', 15, yPos + 8);
                doc.addImage(chartImg, 'PNG', 15, yPos + 12, pageWidth - 30, 55);
                yPos += 75;
            }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('SYSTEM USER ACTIVITY', 15, yPos + 10);
            autoTable(doc, {
                startY: yPos + 15,
                head: [['NAME', 'EMAIL', 'ROLE', 'PHONE', 'STATUS', 'JOINED']],
                body: users.map(u => [
                    toTitleCase(u.name), u.email,
                    toTitleCase(u.role?.replace(/_/g, ' ') || '—'),
                    u.phone || '—', u.isActive ? 'Active' : 'Inactive',
                    formatDate(u.createdAt)
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        if (String(data.cell.raw) === 'Active') data.cell.styles.textColor = '#16a34a';
                        else data.cell.styles.textColor = '#dc2626';
                    }
                }
            });
        }

        // ── 6. Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 210) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        const activeCount    = farmers.filter(f => f.status === 'Active').length;
        const avgFarmSize    = farmers.length ? (farmers.reduce((s, f) => s + (f.farm_size_hectares || 0), 0) / farmers.length).toFixed(1) : '0';
        const cropCounts: any = {};
        filteredCycles.forEach(c => cropCounts[c.crop_name] = (cropCounts[c.crop_name] || 0) + 1);
        const topCrop        = Object.entries(cropCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';
        const harvesting     = filteredCycles.filter(c => c.status?.toLowerCase() === 'harvesting').length;
        const activePercent  = farmers.length ? ((activeCount / farmers.length) * 100).toFixed(1) : '0';
        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        doc.text(`• Platform Health: ${activePercent}% of farmers are currently active.`, 15, lastY + 23);
        doc.text(`• Top Produce: ${topCrop} is the most frequent crop in this period.`, 15, lastY + 29);
        doc.text(`• Average Farm Size: ${avgFarmSize} hectares per registered farmer.`, 15, lastY + 35);
        doc.text(`• Activity: ${filteredStock.length} production batches and ${filteredShipments.length} export shipments logged (${harvesting} cycles harvesting).`, 15, lastY + 41);

        // ── 7. Footer ──
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(229, 231, 235); doc.line(15, 275, pageWidth - 15, 275);
            doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
            doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const footerY = 288;
            doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, footerY, { align: 'right' });
        }

        const tabLabel = tabs.find(t => t.id === activeTab)?.label.replace(/\s/g, '_') || 'Full';
        doc.save(`FreshSarura_${tabLabel}_Report_${startDate}_to_${endDate}.pdf`);
        setIsExportOpen(false);
    };

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview',   label: 'Overview',        icon: BarChart3 },
        { id: 'farmers',    label: 'Farmers & Crops', icon: Leaf      },
        { id: 'production', label: 'Production & QC', icon: Package   },
        { id: 'export',     label: 'Export',          icon: Plane     },
        { id: 'users',      label: 'User Activity',   icon: Users     },
    ];

    // ── Shared chart styles ──
    const chartCard = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5";

    return (
        <div className="p-6 space-y-6 animate-fade-in">

            {/* ── Header Row ── */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Business health monitor and strategic insights
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
                        <Calendar size={15} className="text-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 font-medium">From:</span>
                        <input
                            type="date" value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400 font-medium ml-2">To:</span>
                        <input
                            type="date" value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                    </div>
                    {loading && (
                        <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
                    )}
                    
                    <div className="relative">
                        <button onClick={() => onChange(page - 1)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                            <Download size={15} /> 
                            Export Data
                            
                        </button>

                        
                    </div>
                </div>
            </div>

            {/* ── Tab Navigation (underline style like image 2) ── */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-0 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    active
                                        ? 'border-green-600 text-green-700 dark:text-green-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                                }`}>
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                TAB 1 — OVERVIEW
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Received"   value={`${(totalReceived / 1000).toFixed(1)} Tons`}    icon={Package}  iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600"    trend="up"      trendLabel="+5% vs last period" />
                        <KpiCard label="Total Processed"  value={`${(totalProcessed / 1000).toFixed(1)} Tons`}  icon={BarChart3} iconBg="bg-green-50 dark:bg-green-900/20 text-green-600"  trend="up"      trendLabel="+3% vs last period" />
                        <KpiCard label="Loss Rate"        value={`${lossRate}%`}                                 icon={TrendingDown} iconBg="bg-red-50 dark:bg-red-900/20 text-red-500"   trend={parseFloat(lossRate) > 10 ? 'down' : 'up'} trendLabel={parseFloat(lossRate) > 10 ? 'Needs attention' : 'Within target'} />
                        <KpiCard label="Total Exported"   value={`${(totalExportedKg / 1000).toFixed(1)} Tons`} icon={Plane}    iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600" trend="up"      trendLabel={`${dispatched.length} dispatched`} />
                        <KpiCard label="Shipments"        value={String(filteredShipments.length)}               icon={Plane}    iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600"   trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Registered Farmers" value={String(farmers.length)}                       icon={Leaf}     iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" trend="neutral" trendLabel="Total on platform" />
                        <KpiCard label="Crop Cycles"      value={String(filteredCycles.length)}                  icon={Leaf}     iconBg="bg-teal-50 dark:bg-teal-900/20 text-teal-600"      trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Total Users"      value={String(users.length)}                           icon={Users}    iconBg="bg-gray-100 dark:bg-gray-700 text-gray-500"         trend="neutral" trendLabel="System accounts" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={chartCard} id="packhouse-chart">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Packhouse Activity</h2>
                            <p className="text-xs text-gray-400 mb-4">Received vs Processed vs Rejected (kg)</p>
                            {monthlyStockData.length === 0
                                ? <p className="text-sm text-gray-400 py-8 text-center">No packhouse data in this period.</p>
                                : <ResponsiveContainer width="100%" height={240}>
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
                            }
                        </div>
                        <div className={chartCard} id="shipments-chart">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Export Shipments</h2>
                            <p className="text-xs text-gray-400 mb-4">Volume in Tons over time</p>
                            {monthlyShipmentData.length === 0
                                ? <p className="text-sm text-gray-400 py-8 text-center">No shipment data in this period.</p>
                                : <ResponsiveContainer width="100%" height={240}>
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
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2 — FARMERS & CROPS
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'farmers' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Farmers"    value={String(farmers.length)}  icon={Leaf}  iconBg="bg-green-50 dark:bg-green-900/20 text-green-600"   trend="neutral" trendLabel="Registered on platform" />
                        <KpiCard label="Active Farmers"   value={String(farmers.filter(f => f.status === 'Active').length)} icon={Leaf} iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" trend="up" trendLabel="Currently active" />
                        <KpiCard label="Crop Cycles"      value={String(filteredCycles.length)} icon={BarChart3} iconBg="bg-teal-50 dark:bg-teal-900/20 text-teal-600" trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Avg Farm Size"    value={farmers.length ? `${(farmers.reduce((s, f) => s + (f.farm_size_hectares || 0), 0) / farmers.length).toFixed(1)} ha` : '—'} icon={Package} iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600" trend="neutral" trendLabel="Per registered farmer" />
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
                    <TableShell title="Crop Cycles in Period"
                        headers={['Cycle ID', 'Crop', 'Season', 'Status', 'Started']}
                        total={filteredCycles.length} page={cyclePage} perPage={PER_PAGE} onPage={setCyclePage}>
                        {pagedCycles.length === 0 ? <EmptyRow cols={5} /> :
                            pagedCycles.map(c => (
                                <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{c.cycleId || String(c._id).slice(-8).toUpperCase()}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.crop_name || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.season || '—'}</td>
                                    <td className="px-4 py-3"><Badge status={c.status || 'Active'} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                                </tr>
                            ))}
                    </TableShell>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 3 — PRODUCTION & QC
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'production' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Cold Room Stock" value={`${(coldRoomStockKg / 1000).toFixed(1)} Tons`} icon={Thermometer} iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600" trend="neutral" trendLabel="Processed in period" />
                        <KpiCard label="Total Processed" value={`${totalProcessed.toLocaleString()} kg`} icon={BarChart3}    iconBg="bg-green-50 dark:bg-green-900/20 text-green-600" trend="neutral" trendLabel="After processing" />
                        <KpiCard label="Total Rejected"  value={`${totalRejected.toLocaleString()} kg`}  icon={TrendingDown} iconBg="bg-red-50 dark:bg-red-900/20 text-red-500"     trend="down"    trendLabel="Failed QC" />
                        <KpiCard label="Loss Rate"       value={`${lossRate}%`}                          icon={TrendingDown} iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600" trend={parseFloat(lossRate) > 10 ? 'down' : 'up'} trendLabel={parseFloat(lossRate) > 10 ? 'Above threshold' : 'Within target'} />
                    </div>
                    <div className={chartCard} id="production-chart">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Monthly Packhouse Activity</h2>
                        <p className="text-xs text-gray-400 mb-4">Received vs Processed vs Rejected (kg)</p>
                        {monthlyStockData.length === 0
                            ? <p className="text-sm text-gray-400 py-8 text-center">No data in this period.</p>
                            : <ResponsiveContainer width="100%" height={220}>
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
                        }
                    </div>
                    <TableShell title="Processing Batches"
                        headers={['Stock ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Loss %', 'Status', 'Date']}
                        total={filteredStock.length} page={productionPage} perPage={PER_PAGE} onPage={setProductionPage}>
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
                TAB 4 — EXPORT
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'export' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Shipments"   value={String(filteredShipments.length)}  icon={Plane}    iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600"    trend="neutral" trendLabel="In selected period" />
                        <KpiCard label="Dispatched"        value={String(dispatched.length)}          icon={Plane}    iconBg="bg-green-50 dark:bg-green-900/20 text-green-600"  trend="up"      trendLabel="Successfully sent" />
                        <KpiCard label="Total Exported"    value={`${(totalExportedKg / 1000).toFixed(2)} Tons`} icon={Package} iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600" trend="up" trendLabel="Weight dispatched" />
                        <KpiCard label="Avg Shipment Size" value={dispatched.length ? `${(totalExportedKg / dispatched.length / 1000).toFixed(2)} T` : '—'} icon={BarChart3} iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600" trend="neutral" trendLabel="Per dispatched shipment" />
                    </div>
                    <div className={chartCard} id="export-chart">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Export Volume Over Time</h2>
                        <p className="text-xs text-gray-400 mb-4">Shipment count and weight in Tons</p>
                        {monthlyShipmentData.length === 0
                            ? <p className="text-sm text-gray-400 py-8 text-center">No shipment data in this period.</p>
                            : <ResponsiveContainer width="100%" height={220}>
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
                        }
                    </div>
                    <TableShell title="All Shipments in Period"
                        headers={['PL Number', 'Flight', 'Destination', 'Client', 'Weight (kg)', 'Boxes', 'Status', 'Departure']}
                        total={filteredShipments.length} page={shipmentPage} perPage={PER_PAGE} onPage={setShipmentPage}>
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
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{s.departureDate ? formatDate(s.departureDate) : '—'}</td>
                                </tr>
                            ))}
                    </TableShell>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 5 — USER ACTIVITY
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Total Users"       value={String(users.length)}                              icon={Users} iconBg="bg-gray-100 dark:bg-gray-700 text-gray-500"         trend="neutral" trendLabel="System accounts" />
                        <KpiCard label="Admins"            value={String(users.filter(u => u.role === 'admin').length)} icon={Users} iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600" trend="neutral" trendLabel="Admin accounts" />
                        <KpiCard label="Active Users"      value={String(users.filter(u => u.isActive).length)}      icon={Users} iconBg="bg-green-50 dark:bg-green-900/20 text-green-600"   trend="up"      trendLabel="Approved accounts" />
                        <KpiCard label="Pending Approval"  value={String(users.filter(u => !u.isActive).length)}     icon={Users} iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600"   trend="neutral" trendLabel="Awaiting activation" />
                    </div>
                    <div className={chartCard} id="user-role-chart">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">User Distribution by Role</h2>
                        <p className="text-xs text-gray-400 mb-4">Number of accounts per system role</p>
                        {roleData.length === 0
                            ? <p className="text-sm text-gray-400 text-center py-4">No user data.</p>
                            : <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={roleData} layout="vertical" barSize={16}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                    <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: '#6b7280' }} width={130} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="count" fill="#22c55e" radius={[0,4,4,0]} name="Users" />
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    </div>
                    <TableShell title="All System Users"
                        headers={['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined']}
                        total={users.length} page={userPage} perPage={PER_PAGE} onPage={setUserPage}>
                        {pagedUsers.length === 0 ? <EmptyRow cols={6} msg="No users found." /> :
                            pagedUsers.map(u => (
                                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{u.name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">{(u.role || '').replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.phone || '—'}</td>
                                    <td className="px-4 py-3"><Badge status={u.isActive ? 'Active' : 'Inactive'} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                                </tr>
                            ))}
                    </TableShell>
                </div>
            )}
        </div>
    );
};

export default Reports;
