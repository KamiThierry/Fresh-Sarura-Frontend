import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, FileText, Plane, Package, ArrowUpRight, 
         Search, Filter, Loader2, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, Download, FileSpreadsheet } from 'lucide-react';
import ShipmentBuilderModal from '../components/ShipmentBuilderModal';
import ShipmentDetailsModal from '../components/ShipmentDetailsModal';
import Pagination from '../../shared/component/Pagination';
import { api } from '../../../lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import * as XLSX from 'xlsx';
import { getReportFooterText } from '@/lib/utils';

// ── Single source of truth for status display ─────────────────────
const STATUS_CONFIG: Record<string, {
    label: string; dot: string;
    bg: string; text: string;
}> = {
    Draft: {
        label: 'Draft',
        dot: 'bg-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-700/30',
        text: 'text-gray-600 dark:text-gray-400',
    },
    PackingListGenerated: {
        label: 'Scheduled',
        dot: 'bg-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
    },
    Departed: {
        label: 'In Transit',
        dot: 'bg-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
    },
    Shipped: {
        label: 'Shipped',
        dot: 'bg-green-500',
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
    },
    Cancelled: {
        label: 'Cancelled',
        dot: 'bg-red-500',
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
    },
};

// Departure overdue — scheduled but flight time passed
const isDepartureOverdue = (shipment: any): boolean => {
    if (shipment.status !== 'PackingListGenerated') return false;
    const dep = new Date(shipment.departureDate);
    if (shipment.departureTime) {
        const [h, m] = shipment.departureTime.split(':').map(Number);
        dep.setHours(h, m, 0, 0);
    }
    return dep < new Date();
};

// Arrival overdue — in transit but estimated arrival passed
const isArrivalOverdue = (shipment: any): boolean => {
    if (shipment.status !== 'Departed') return false;
    if (!shipment.departedAt) return false;
    const arrival = new Date(shipment.departedAt);
    arrival.setHours(arrival.getHours() + (shipment.estimatedFlightHours || 8));
    return arrival < new Date();
};

const Shipments = () => {
    const [shipments, setShipments]           = useState<any[]>([]);
    const [loading, setLoading]               = useState(true);
    const [isBuilderOpen, setIsBuilderOpen]   = useState(false);
    const [isExportOpen, setIsExportOpen]     = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [searchTerm, setSearchTerm]         = useState('');
    const [statusFilter, setStatusFilter]     = useState('all');
    const [clientFilter, setClientFilter]     = useState('all');
    const [destFilter, setDestFilter]         = useState('all');
    const [searchParams]                      = useSearchParams();
    const [currentPage, setCurrentPage]       = useState(1);
    const itemsPerPage = 5;

    const fetchShipments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/shipments');
            const data = res.data?.data ?? res.data ?? [];
            setShipments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch shipments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchShipments(); }, [fetchShipments]);

    useEffect(() => {
        const flightParam = searchParams.get('flight');
        if (flightParam) setSearchTerm(flightParam);
    }, [searchParams]);

    const filteredShipments = shipments.filter(s => {
        const matchesSearch = searchTerm === '' ||
            s.plNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.destination?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchesClient = clientFilter === 'all' || s.clientName === clientFilter;
        const matchesDest   = destFilter === 'all' || s.destination === destFilter;
        return matchesSearch && matchesStatus && matchesClient && matchesDest;
    });

    const uniqueClients = Array.from(new Set(shipments.map(s => s.clientName).filter(Boolean))).sort();
    const uniqueDestinations = Array.from(new Set(shipments.map(s => s.destination).filter(Boolean))).sort();

    // Stats derived from real status field
    const weeklyVolumeKg  = shipments.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
    const activeCount     = shipments.filter(s =>
        s.status === 'PackingListGenerated' || s.status === 'Departed'
    ).length;
    const departureOverdueCount = shipments.filter(isDepartureOverdue).length;
    const arrivalOverdueCount   = shipments.filter(isArrivalOverdue).length;

    const pendingDocsCount = shipments.filter(s =>
        s.status === 'PackingListGenerated' || s.status === 'Departed'
    ).length;

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const headers = ['Departure Date', 'Flight', 'Destination', 'Client', 'PL Number', 'Boxes', 'Volume (kg)', 'Status'];
        const rows = shipments.map(s => [
            s.departureDate ? formatDate(s.departureDate) : 'N/A',
            s.flightNumber || 'N/A',
            s.destination || 'N/A',
            s.clientName || 'N/A',
            s.plNumber || 'N/A',
            s.totalBoxes || 0,
            s.totalWeightKg || 0,
            STATUS_CONFIG[s.status]?.label || 'Draft'
        ]);

        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        ws['!cols'] = headers.map((h, i) => {
            const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
            return { wch: Math.min(maxLen + 4, 80) };
        });
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
        XLSX.writeFile(wb, `FreshSarura_Shipments_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

        // Header
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.line(15, 30, pageWidth - 15, 30);

        // Report Title
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('EXPORT SHIPMENTS REPORT', 15, 42);

        // Summary Fields
        let yPos = 52;
        doc.setFontSize(9);
        const activeFilters = [
            { label: 'Total Shipments', value: shipments.length.toString() },
            { label: 'Total Volume', value: `${weeklyVolumeKg.toLocaleString()} kg` },
            { label: 'Active Shipments', value: activeCount.toString() },
            { label: 'Pending Docs', value: pendingDocsCount.toString() }
        ];

        activeFilters.forEach(field => {
            doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
            doc.text(field.label, 15, yPos);
            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
            doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
            doc.setDrawColor(243, 244, 246);
            doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
            yPos += 10;
        });

        // Table
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
        doc.text('SHIPMENTS LOG', 15, yPos + 10);
        
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        autoTable(doc, {
            startY: yPos + 15,
            head: [['DATE / FLIGHT', 'DESTINATION', 'CLIENT', 'PL NUMBER', 'VOLUME', 'STATUS']],
            body: shipments.map(s => [
                `${s.departureDate ? formatDate(s.departureDate) : 'N/A'}\n${s.flightNumber || 'N/A'}`,
                s.destination || 'N/A',
                s.clientName || 'N/A',
                s.plNumber || 'N/A',
                `${s.totalBoxes || 0} Boxes\n${s.totalWeightKg || 0} kg`,
                STATUS_CONFIG[s.status]?.label || 'Draft'
            ]),
            theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
            margin: { left: 15, right: 15, bottom: 30 }
        });

        // System Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report details packing lists, flight schedules, and overall export volumes.', 15, lastY + 25);

        // Footer
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

        doc.save(`FreshSarura_Shipments_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in pb-20">

            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        Manage packing lists and flight schedules.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap ml-auto justify-end">
                    <button
                        onClick={fetchShipments}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                    
                    <div className="relative">
                        <button
                            onClick={fetchShipments}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                        >
                            <Download size={15} />
                            Export Data
                            
                        </button>

                        
                    </div>

                    <button
                        onClick={() => setIsBuilderOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 text-sm"
                    >
                        <Plus size={18} /> Create Packing List
                    </button>
                </div>
            </div>
            </div>

            {/* Overdue alert banner */}
            {departureOverdueCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                            {departureOverdueCount} scheduled shipment{departureOverdueCount > 1 ? 's have' : ' has'} passed departure time
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                            Open the shipment and confirm whether the flight departed or was cancelled.
                        </p>
                    </div>
                </div>
            )}

            {arrivalOverdueCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl">
                    <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">
                            {arrivalOverdueCount} in-transit shipment{arrivalOverdueCount > 1 ? 's have' : ' has'} reached estimated arrival time
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                            Open the shipment and confirm cargo has been shipped.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        label: 'Weekly Volume',
                        value: `${weeklyVolumeKg.toLocaleString()} kg`,
                        icon: Package,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-100 dark:bg-emerald-900/30'
                    },
                    {
                        label: 'Active Shipments',
                        value: `${activeCount} Active`,
                        icon: Plane,
                        color: 'text-blue-600',
                        bg: 'bg-blue-100 dark:bg-blue-900/30'
                    },
                    {
                        label: 'Pending Docs',
                        value: `${pendingDocsCount} To Review`,
                        icon: FileText,
                        color: 'text-amber-600',
                        bg: 'bg-amber-100 dark:bg-amber-900/30'
                    },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</div>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-wrap items-center gap-3">
                    {/* Unified Search & Filter Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search PL #, Flight or Client..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                        />
                    </div>
                    <div className="relative w-40 flex-shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="all">All Statuses</option>
                            <option value="PackingListGenerated">Scheduled</option>
                            <option value="Departed">In Transit</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                    <div className="relative w-40 flex-shrink-0">
                        <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={clientFilter}
                            onChange={e => { setClientFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="all">All Clients</option>
                            {uniqueClients.map((c: any) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                    <div className="relative w-40 flex-shrink-0">
                        <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={destFilter}
                            onChange={e => { setDestFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="all">All Destinations</option>
                            {uniqueDestinations.map((d: any) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                    {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all' || destFilter !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setClientFilter('all'); setDestFilter('all'); setCurrentPage(1); }}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-bold px-2 flex-shrink-0"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Date / Flight</th>
                                    <th className="px-6 py-4 font-semibold">Client / Destination</th>
                                    <th className="px-6 py-4 font-semibold">PL Number</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Volume</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredShipments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <Plane size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                            <p className="text-gray-400 text-sm font-medium">No shipments found.</p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                Mark export batches as Ready for Export, then create a packing list.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredShipments
                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                        .map(shipment => {
                                            const cfg      = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.Draft;
                                            const depOverdue = isDepartureOverdue(shipment);
                                            const arrOverdue = isArrivalOverdue(shipment);
                                            const overdue    = depOverdue || arrOverdue;

                                            return (
                                                <tr
                                                    key={shipment._id}
                                                    onClick={() => setSelectedShipment(shipment)}
                                                    className={`transition-colors cursor-pointer ${
                                                        arrOverdue
                                                            ? 'bg-green-50/40 dark:bg-green-900/5 hover:bg-green-50 dark:hover:bg-green-900/10'
                                                            : depOverdue
                                                                ? 'bg-amber-50/40 dark:bg-amber-900/5 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    }`}
                                                >
                                                    {/* Date / Flight */}
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {formatDate(shipment.departureDate)}
                                                        </div>
                                                        <div className="text-gray-500 flex items-center gap-1 mt-0.5 text-xs">
                                                            <Plane size={11} />
                                                            {shipment.flightNumber}
                                                            {shipment.departureTime && (
                                                                <span className={`ml-1 ${overdue ? 'text-amber-600 dark:text-amber-400 font-bold' : 'opacity-70'}`}>
                                                                    ({shipment.departureTime})
                                                                    {overdue && ' ⚠'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Client / Destination */}
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {shipment.clientName || '—'}
                                                        </div>
                                                        <div className="text-gray-500 text-xs mt-0.5">{shipment.destination}</div>
                                                    </td>

                                                    {/* PL Number — standalone column */}
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium font-mono">
                                                            {shipment.plNumber}
                                                        </span>
                                                    </td>

                                                    {/* Status — own column, driven by real backend status */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${
                                                                shipment.status === 'Departed' ? 'animate-pulse' : ''
                                                            }`} />
                                                            {cfg.label}
                                                        </span>
                                                        {depOverdue && (
                                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                                                                <AlertTriangle size={9} /> Confirm departure
                                                            </p>
                                                        )}
                                                        {arrOverdue && (
                                                            <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-1 flex items-center gap-1">
                                                                <CheckCircle size={9} /> Confirm shipped
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Volume */}
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {shipment.totalBoxes} {shipment.totalBoxes === 1 ? 'Box' : 'Boxes'}
                                                        </div>
                                                        <div className="text-gray-500 text-xs mt-0.5">
                                                            {shipment.totalWeightKg?.toLocaleString()} kg
                                                        </div>
                                                    </td>

                                                    {/* Action */}
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            onClick={e => { e.stopPropagation(); setSelectedShipment(shipment); }}
                                                        >
                                                            <ArrowUpRight size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredShipments.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <ShipmentBuilderModal
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSuccess={() => { setIsBuilderOpen(false); fetchShipments(); }}
            />

            <ShipmentDetailsModal
                isOpen={!!selectedShipment}
                onClose={() => setSelectedShipment(null)}
                shipment={selectedShipment}
                onStatusChange={fetchShipments}  // renamed from onDispatched
            />
        </div>
    );
};

export default Shipments;
