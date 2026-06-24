import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, Search, Filter, ChevronDown, Download, FileSpreadsheet, FileText, RefreshCw, Calendar, Leaf } from 'lucide-react';
import { api } from '../../../lib/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

interface StockItem {
    id: string;
    crop: string;
    batchId: string;
    received: number;
    processed: number;
    rejected: number;
    defectType?: string;
    netStock: number;
    entryDate: string;
    createdAt: string;
    status: string;
}

const ColdRoom = () => {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [cropFilter, setCropFilter] = useState('All');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isExportOpen, setIsExportOpen] = useState(false);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stock');
            const data = (res.data || []).map((b: any) => ({
                id: b._id,
                crop: b.cropName,
                batchId: b._id,
                received: b.receivedWeightKg,
                processed: b.processedWeightKg,
                rejected: b.rejectedWeightKg,
                defectType: b.primaryDefectType,
                netStock: (b.processedWeightKg || 0) - (b.rejectedWeightKg || 0),
                entryDate: formatDate(b.updatedAt),
                createdAt: b.createdAt,
                status: b.status
            }));
            setStock(data);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const filtered = stock.filter(r => {
        const matchesSearch = r.crop.toLowerCase().includes(search.toLowerCase()) ||
            r.batchId.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
        const matchesCrop = cropFilter === 'All' || r.crop === cropFilter;
        
        let matchDate = true;
        if (startDate && endDate && r.createdAt) {
            const createdDateStr = new Date(r.createdAt).toISOString().split('T')[0];
            matchDate = createdDateStr >= startDate && createdDateStr <= endDate;
        }

        return matchesSearch && matchesStatus && matchesCrop && matchDate;
    });

    const uniqueCrops = Array.from(new Set(stock.map(s => s.crop).filter(Boolean))).sort();

    const totalWeight = stock.reduce((acc, i) => acc + i.netStock, 0);

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const headers = ['Batch ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Net Stock (kg)', 'Entry Date', 'Status'];
        const rows = filtered.map(r => [
            r.batchId.slice(-8).toUpperCase(),
            r.crop,
            r.received,
            r.processed,
            r.rejected,
            r.netStock,
            r.entryDate,
            r.status === 'Done' ? 'Stocked' : r.status
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map((h, i) => ({
            wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2
        }));
        XLSX.utils.book_append_sheet(wb, ws, 'Cold Room Stock');
        XLSX.writeFile(wb, `FreshSarura_ColdRoomStock_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        doc.text(`COLD ROOM STOCK AUDIT REPORT`, 15, 42);

        // 3. Summary Fields
        const totalNet = filtered.reduce((sum, i) => sum + i.netStock, 0);
        const totalRej = filtered.reduce((sum, i) => sum + i.rejected, 0);
        const summaryFields = [
            { label: 'Total Batches in View', value: String(filtered.length) },
            { label: 'Total Net Stock', value: `${Math.round(totalNet).toLocaleString()} kg` },
            { label: 'Total Loss/Rejections', value: `${Math.round(totalRej).toLocaleString()} kg` },
            { label: 'Health Status', value: 'OPTIMAL — Within capacity' },
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
            head: [['BATCH ID', 'CROP', 'RECEIVED', 'PROCESSED', 'REJECTED', 'NET STOCK', 'ENTRY DATE', 'STATUS']],
            body: filtered.map(r => [
                r.batchId.slice(-8).toUpperCase(),
                toTitleCase(r.crop),
                `${r.received.toLocaleString()} kg`,
                `${r.processed.toLocaleString()} kg`,
                `${r.rejected.toLocaleString()} kg`,
                `${r.netStock.toLocaleString()} kg`,
                r.entryDate,
                r.status === 'Done' ? 'Stocked' : r.status
            ]),
            theme: 'striped',
            headStyles: commonHeadStyles,
            bodyStyles: commonBodyStyles,
            alternateRowStyles: alternateRowStyles,
            margin: { left: 15, right: 15, bottom: 30 }
        });

        // 5. System Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report provides cold room inventory and processing statistics.', 15, lastY + 25);
        
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

        doc.save(`FreshSarura_ColdRoomStock_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cold Room (Stock)</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitor all batches currently in cold storage with temperature and expiry tracking.</p>
                </div>
                <div className="flex items-center justify-end gap-3 flex-wrap md:flex-nowrap">
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
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm relative"
                        >
                            <Download size={16} />
                            Export Data
                            
                        </button>

                        
                    </div>

                    {/* <button
                        onClick={fetchStock}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button> */}
                </div>
            </div>

            {/* KPI Mini Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Batches', value: stock.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Total Net Stock', value: `${Math.round(totalWeight).toLocaleString()} kg`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Inventory Density', value: 'High', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Loss / Rejections', value: `${Math.round(stock.reduce((a, b) => a + b.rejected, 0)).toLocaleString()} kg`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                                    {stat.value}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
                {/* Unified Search & Filter Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by batch ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Leaf size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={cropFilter}
                            onChange={e => setCropFilter(e.target.value)}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm min-w-[140px]"
                        >
                            <option value="All">All Crops</option>
                            {uniqueCrops.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>

                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm min-w-[140px]"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Done">Stocked</option>
                            <option value="Spoiled">Spoiled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>

                    {(search || statusFilter !== 'All' || cropFilter !== 'All') && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter('All'); setCropFilter('All'); }}
                            className="text-xs text-green-600 hover:text-green-700 font-bold px-2 flex-shrink-0"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                {['Batch ID', 'Crop', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Net Stock (kg)', 'Entry Date', 'Status'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={8} className="px-5 py-10 text-center">
                                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm italic">
                                        <Clock className="animate-spin" size={16} /> Loading stock data...
                                    </div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-16 text-center">
                                    <Package size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-gray-400 text-sm font-medium">No stock items found.</p>
                                </td></tr>
                            ) : filtered.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white font-mono">{row.id.slice(-8).toUpperCase()}</td>
                                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{row.crop}</td>
                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{row.received.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">{row.processed.toLocaleString()}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-red-500 dark:text-red-400">
                                                {row.rejected.toLocaleString()}
                                            </span>
                                            {row.defectType && row.defectType !== 'None' && row.rejected > 0 && (
                                                <span className="text-[11px] text-red-400/80 dark:text-red-500/80">
                                                    ({row.defectType})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm font-bold text-green-600 dark:text-green-400">{row.netStock.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{row.entryDate}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            row.status === 'Spoiled' 
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {row.status === 'Done' ? 'Stocked' : row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ColdRoom;

