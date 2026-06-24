import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Filter, Download, ChevronDown, Calendar,
    FileSpreadsheet, FileText, Package, Plane,
    Leaf, Sprout, UserCog, ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import * as XLSX from 'xlsx';
import { formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
type LogModule = 'Farmer Management' | 'Crop Planning' | 'Production & QC' | 'Export & Shipments' | 'User Management';

interface LogEntry {
    _id: string;
    timestamp: string;
    module: LogModule;
    action: string;
    actor: string;
    detail: string;
}

// ─── Constants ────────────────────────────────────────────────────
const MODULE_COLORS: Record<LogModule, string> = {
    'Farmer Management': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Crop Planning': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Production & QC': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Export & Shipments': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'User Management': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const EventLogs = () => {
    const [events, setEvents] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [actorFilter, setActorFilter] = useState('All');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3); // Default to last 3 months
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (moduleFilter !== 'All') params.append('module', moduleFilter);
            if (actionFilter !== 'All') params.append('action', actionFilter);
            if (actorFilter !== 'All') params.append('actor', actorFilter);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await api.get(`/event-logs?${params.toString()}`);
            const data = res.data?.data ?? res.data ?? [];

            const mappedData = data.map((log: any) => ({
                _id: log._id,
                timestamp: log.timestamp || log.createdAt,
                module: log.module || 'User Management', // Fallback
                action: log.action || (log.description?.includes('login') ? 'User Login' : 'Action'),
                actor: log.actor || 'System',
                detail: log.description || log.detail || ''
            }));

            setEvents(mappedData);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    }, [moduleFilter, actionFilter, actorFilter, searchTerm, startDate, endDate]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timeout);
    }, [fetchLogs]);

    const paginatedEvents = events.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(events.length / itemsPerPage);

    const summaryStats = [
        { label: 'Total Activities', value: events.length.toString(), icon: ShieldAlert, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Farmer Actions', value: events.filter(e => e.module === 'Farmer Management').length.toString(), icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { label: 'Production Actions', value: events.filter(e => e.module === 'Production & QC').length.toString(), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Export Actions', value: events.filter(e => e.module === 'Export & Shipments').length.toString(), icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    const displayDate = (dateStr: string) => formatDateTime(dateStr);

    const modules = ['Farmer Management', 'Crop Planning', 'Production & QC', 'Export & Shipments', 'User Management'];
    const actions = useMemo(() => Array.from(new Set(events.map(e => e.action))).sort(), [events]);
    const actors = useMemo(() => Array.from(new Set(events.map(e => e.actor))).sort(), [events]);

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const headers = ['Timestamp', 'Module', 'Action', 'Actor', 'Detail'];
        const rows = events.map(e => [
            displayDate(e.timestamp),
            e.module,
            e.action,
            e.actor,
            e.detail
        ]);

        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        ws['!cols'] = headers.map((h, i) => {
            const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
            return { wch: Math.min(maxLen + 4, 80) };
        });
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        XLSX.utils.book_append_sheet(wb, ws, 'Activity Log');
        XLSX.writeFile(wb, `FreshSarura_Activity_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.line(15, 30, pageWidth - 15, 30);

        // Report Title
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM ACTIVITY LOG', 15, 42);

        // Summary Fields
        let yPos = 52;
        doc.setFontSize(9);
        const activeFilters = [
            { label: 'Total Activities', value: events.length.toString() },
            { label: 'Farmer Actions', value: events.filter(e => e.module === 'Farmer Management').length.toString() },
            { label: 'Production Actions', value: events.filter(e => e.module === 'Production & QC').length.toString() },
            { label: 'Export Actions', value: events.filter(e => e.module === 'Export & Shipments').length.toString() }
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
        doc.text('ACTIVITY STREAM', 15, yPos + 10);
        
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        autoTable(doc, {
            startY: yPos + 15,
            head: [['TIMESTAMP', 'MODULE', 'ACTION', 'ACTOR', 'DETAIL']],
            body: events.map(e => [
                displayDate(e.timestamp), e.module, e.action, e.actor, e.detail
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
        doc.text('• This report logs system-wide audit events and user activity.', 15, lastY + 25);

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

        doc.save(`FreshSarura_Activity_Log_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">Activity Log</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">All actions performed across Fresh Sarura</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
                        <Calendar size={15} className="text-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 font-medium">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400 font-medium ml-2">To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                            <Download size={15} />
                            Export Log
                            
                        </button>

                    
                </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {summaryStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={stat.color} size={22} /></div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stat.value}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Unified Search & Filter Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search actor name, detail, or batch ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition-all"
                        />
                    </div>

                    {/* Module Filter */}
                    <div className="relative w-48 flex-shrink-0">
                        <Sprout size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={moduleFilter}
                            onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="All">All Modules</option>
                            {modules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>

                    {/* Action Filter */}
                    <div className="relative w-56 flex-shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="All">All Actions</option>
                            {actions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>

                    {/* Actor Filter */}
                    <div className="relative w-48 flex-shrink-0">
                        <UserCog size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={actorFilter}
                            onChange={(e) => { setActorFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            <option value="All">All Actors</option>
                            {actors.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                                {['Timestamp', 'Module', 'Action', 'Actor', 'Detail'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Loading activity stream...</td></tr>
                            ) : paginatedEvents.length === 0 ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No activities found matching filters.</td></tr>
                            ) : (
                                paginatedEvents.map(event => (
                                    <tr key={event._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            {displayDate(event.timestamp)}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${MODULE_COLORS[event.module as LogModule] || 'bg-gray-100 text-gray-700'}`}>
                                                {event.module}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-semibold text-gray-900 dark:text-white">{event.action}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-300 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                    {event.actor.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">{event.actor}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 italic">
                                            {event.detail}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, events.length)} of {events.length}</p>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Prev</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${p === currentPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{p}</button>
                            ))}
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventLogs;
