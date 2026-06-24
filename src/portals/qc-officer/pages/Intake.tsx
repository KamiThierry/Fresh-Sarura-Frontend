import React, { useState, useEffect } from 'react';
import { Truck, Package, RefreshCw, Download, FileSpreadsheet, FileText, ChevronDown, Search, Filter, Users, Calendar } from 'lucide-react';
import { api } from '../../../lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

interface IntakeRecord {
    id: string;
    intakeLogId: string;
    crop: string;
    supplier: string;
    arrivalTime: string;
    arrivalDate: string;
    rawDate: Date;
    weight: string;
    weightNum: number;
    driverName: string;
    vehiclePlate: string;
    status: string;
}

const statusConfig: Record<string, { label: string; classes: string; pdfColor: string }> = {
    AwaitingQC:    { label: 'Awaiting QC',     classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', pdfColor: '#d97706' },
    RoomRequested: { label: 'Room Requested',  classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    pdfColor: '#2563eb' },
    Processing:    { label: 'In Processing',   classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', pdfColor: '#4f46e5' },
    QCDone:        { label: 'QC Done',         classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', pdfColor: '#9333ea' },
    Done:          { label: 'Stocked',         classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', pdfColor: '#16a34a' },
    Spoiled:       { label: 'Spoiled',         classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       pdfColor: '#dc2626' },
};

const Intake = () => {
    const [intakes, setIntakes] = useState<IntakeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [supplierFilter, setSupplierFilter] = useState('All');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3); // Default to last 3 months
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchIntakes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const res = await api.get(`/harvest-declarations/intake-logs?${params.toString()}`);
            const logsArray = res.data?.data || res.data || (Array.isArray(res) ? res : []);
            
            const data = logsArray.map((d: any) => {
                const truck = d.truckId;
                const driverName = truck?.currentDriver
                    ? `${truck.currentDriver.firstName} ${truck.currentDriver.lastName}`
                    : '—';
                const vehiclePlate = truck?.plateNumber || '—';
                const dec = d.harvestDeclarationId;
                const arrivedAt = new Date(d.arrivedAt || d.createdAt);

                return {
                    id: String(dec?._id || d.declarationId || d.harvestDeclarationId || d._id),
                    intakeLogId: String(d._id),
                    crop: String(dec?.cropName || d.cropName || '—'),
                    supplier: String(
                        dec?.farmerId?.full_name && dec?.farmName 
                            ? `${dec.farmerId.full_name} (${dec.farmName})`
                            : (dec?.farmerId?.full_name || dec?.farmName || '—')
                    ),
                    arrivalDate: formatDate(arrivedAt),
                    arrivalTime: arrivedAt.toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit'
                    }),
                    rawDate: arrivedAt,
                    weight: `${(d.pickedUpWeightKg || 0).toLocaleString()} kg`,
                    weightNum: d.pickedUpWeightKg || 0,
                    driverName,
                    vehiclePlate,
                    status: d.status || 'AwaitingQC',
                };
            });
            setIntakes(data);
        } catch (err) {
            console.error('Failed to fetch intake logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchIntakes();
        }, 300);
        return () => clearTimeout(timeout);
    }, [startDate, endDate]);

    const uniqueSuppliers = Array.from(new Set(intakes.map(r => r.supplier))).sort();

    const filtered = React.useMemo(() => {
        return intakes.filter(r => {
            const matchSearch = r.intakeLogId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.crop.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (statusConfig[r.status]?.label || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchStatus = statusFilter === 'All' || r.status === statusFilter;
            const matchSupplier = supplierFilter === 'All' || r.supplier === supplierFilter;

            return matchSearch && matchStatus && matchSupplier;
        });
    }, [intakes, searchTerm, statusFilter, supplierFilter]);

    const paginated = React.useMemo(() => 
        filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    , [filtered, currentPage]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const totalWeightKg = intakes.reduce((sum, i) => sum + i.weightNum, 0);
    
    // Stats: Today's Intake (start of today)
    const todayWeightKg = React.useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return intakes
            .filter(i => i.rawDate >= todayStart)
            .reduce((sum, i) => sum + i.weightNum, 0);
    }, [intakes]);

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const headers = ['Ref ID', 'Crop', 'Supplier', 'Arrival Date', 'Arrival Time', 'Weight', 'Driver', 'Vehicle Plate', 'Status'];
        const rows = filtered.map(r => [
            `INT${r.intakeLogId.slice(-6).toUpperCase()}`,
            r.crop,
            r.supplier,
            r.arrivalDate,
            r.arrivalTime,
            r.weight,
            r.driverName,
            r.vehiclePlate,
            statusConfig[r.status]?.label || r.status
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map((h, i) => ({
            wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2
        }));
        XLSX.utils.book_append_sheet(wb, ws, 'Intake Logs');
        XLSX.writeFile(wb, `FreshSarura_IntakeLog_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

        const toTitleCase = (str: string) =>
            str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // 1. Header
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch (e) { console.warn('Logo failed'); }
        doc.setTextColor(21, 128, 61);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.setTextColor(17, 24, 39);
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.line(15, 30, pageWidth - 15, 30);

        // 2. Report Title
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`PRODUCE INTAKE TRACEABILITY REPORT`, 15, 42);

        // 3. Summary Fields
        const filteredWeight = filtered.reduce((sum, i) => sum + i.weightNum, 0);
        const summaryFields = [
            { label: 'Total Intake Records', value: String(filtered.length) },
            { label: 'Total Volume (kg)', value: `${filteredWeight.toLocaleString()} kg` },
            { label: 'Awaiting Processing', value: String(filtered.filter(r => r.status === 'AwaitingQC').length) },
            { label: 'Successfully Stocked', value: String(filtered.filter(r => r.status === 'Done').length) },
        ];

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

        // 4. Data Table
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        autoTable(doc, {
            startY: yPos + 10,
            head: [['REF ID', 'CROP', 'SUPPLIER', 'ARRIVAL', 'WEIGHT', 'DRIVER / VEHICLE', 'STATUS']],
            body: filtered.map(r => [
                `INT${r.intakeLogId.slice(-6).toUpperCase()}`,
                toTitleCase(r.crop),
                r.supplier,
                `${r.arrivalDate} ${r.arrivalTime}`,
                r.weight,
                `${r.driverName}\n${r.vehiclePlate}`,
                statusConfig[r.status]?.label || r.status
            ]),
            theme: 'striped',
            headStyles: commonHeadStyles,
            bodyStyles: commonBodyStyles,
            alternateRowStyles: alternateRowStyles,
            margin: { left: 15, right: 15, bottom: 30 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 6) {
                    const statusKey = filtered[data.row.index].status;
                    const config = statusConfig[statusKey];
                    if (config?.pdfColor) {
                        data.cell.styles.textColor = config.pdfColor;
                    }
                }
            }
        });

        // 5. Operational Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 210) { doc.addPage(); lastY = 20; }
        
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        
        const stockedRate = filtered.length ? ((filtered.filter(r => r.status === 'Done').length / filtered.length) * 100).toFixed(1) : '0';
        const spoiledCount = filtered.filter(r => r.status === 'Spoiled').length;
        
        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        doc.text(`• Workflow Efficiency: ${stockedRate}% of arrivals in this report have been successfully moved to stock.`, 15, lastY + 23);
        doc.text(`• Quality Alert: ${spoiledCount} batch${spoiledCount !== 1 ? 'es' : ''} flagged as spoiled during the quality control process.`, 15, lastY + 29);
        doc.text(`• Volume Handling: Total volume represented in this report is ${(filteredWeight / 1000).toFixed(2)} Tons.`, 15, lastY + 35);
        doc.text(`• Data Coverage: This report covers ${filtered.length} unique produce intake events.`, 15, lastY + 41);

        // 6. Footer
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

        doc.save(`FreshSarura_IntakeLog_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    const stats = [
        { label: 'Total Intake Logs', value: intakes.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Total Weight Received', value: `${totalWeightKg.toLocaleString()} kg`, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: "Today's Intake", value: `${todayWeightKg.toLocaleString()} kg`, icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Intake Log</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Full traceability record of all received produce.</p>
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
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download size={14} /> Export
                        </button>
                    </div>
                    <button
                        onClick={fetchIntakes}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{s.value}</div>
                            </div>
                            <div className={`p-3 rounded-lg ${s.bg}`}>
                                <s.icon size={24} className={s.color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
                {/* Unified Search & Filter Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by crop, supplier, plate number..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="All">All Statuses</option>
                            {Object.entries(statusConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>

                    <div className="relative">
                        <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={supplierFilter}
                            onChange={e => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="All">All Suppliers</option>
                            {uniqueSuppliers.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw size={28} className="animate-spin text-green-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <Truck size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-400 text-sm font-medium">No intake logs found.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                    {['Ref ID', 'Crop', 'Supplier', 'Arrival', 'Weight', 'Driver / Vehicle', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginated.map(row => (
                                    <tr key={row.intakeLogId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-4 font-mono text-sm font-bold text-gray-900 dark:text-white">
                                            INT{row.intakeLogId.slice(-6).toUpperCase()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{row.crop}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{row.supplier}</td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.arrivalDate}</p>
                                            <p className="text-xs text-gray-400">{row.arrivalTime}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{row.weight}</td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.driverName}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{row.vehiclePlate}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[row.status]?.classes || 'bg-gray-100 text-gray-600'}`}>
                                                {statusConfig[row.status]?.label || row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Prev</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${p === currentPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{p}</button>
                            ))}
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Intake;
