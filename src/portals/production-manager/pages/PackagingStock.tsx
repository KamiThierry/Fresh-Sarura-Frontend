import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Package2, Plus, AlertTriangle, Edit2, Trash2, Download, ChevronDown, FileSpreadsheet, FileText, Search, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PackagingLotDetailModal from '../components/PackagingLotDetailModal';
import EditPackagingLotModal from '../components/EditPackagingLotModal';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

const PackagingStockPage = () => {
    const [lots, setLots] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        vendor: '', pricePerBox: '', quantityReceived: '', receivedDate: '', notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [selectedLot, setSelectedLot] = useState<any | null>(null);
    const [editingLot, setEditingLot] = useState<any | null>(null);
    const [lotToDelete, setLotToDelete] = useState<any | null>(null);
    const { showToast } = useToastContext();

    // Filters and Export State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [vendorFilter, setVendorFilter] = useState('all');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const filteredLots = useMemo(() => {
        return lots.filter(lot => {
            const matchesSearch = lot.vendor.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesVendorSelect = vendorFilter === 'all' || lot.vendor === vendorFilter;
            const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
            const lotDate = new Date(lot.receivedDate).getTime();
            const matchesFrom = dateFrom ? lotDate >= new Date(dateFrom).getTime() : true;
            const matchesTo = dateTo ? lotDate <= new Date(dateTo).setHours(23, 59, 59, 999) : true;
            return matchesSearch && matchesVendorSelect && matchesStatus && matchesFrom && matchesTo;
        });
    }, [lots, searchQuery, vendorFilter, statusFilter, dateFrom, dateTo]);

    const exportExcel = () => {
        const data = filteredLots.map(lot => ({
            'Vendor/Brand': lot.vendor,
            'Date Received': new Date(lot.receivedDate).toLocaleDateString('en-GB'),
            'Received Boxes': lot.quantityReceived,
            'Available Boxes': lot.quantityAvailable,
            'Price Per Box (Rwf)': lot.pricePerBox,
            'Total Value (Rwf)': lot.quantityReceived * lot.pricePerBox,
            'Status': lot.status === 'active' ? 'Active' : 'Depleted'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Packaging Stock");
        XLSX.writeFile(wb, `Packaging_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
        setShowExportMenu(false);
    };

    const exportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

        // ── 1. Header ──
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch (e) { console.warn('Logo failed'); }
        doc.setTextColor(21, 128, 61); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.setTextColor(17, 24, 39);
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235); doc.line(15, 30, pageWidth - 15, 30);

        // ── 2. Title ──
        doc.setTextColor(17, 24, 39); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('PACKAGING STOCK REPORT', 15, 42);

        // ── 3. Summary Section ──
        const summaryFields = [
            { label: 'Total Available', value: `${summary?.totalAvailableBoxes?.toLocaleString() || 0} Boxes` },
            { label: 'Avg Price / Box', value: `${summary?.averagePricePerBox?.toLocaleString() || 0} Rwf` },
            { label: 'Stock Status', value: (summary?.totalAvailableBoxes || 0) < 50 ? 'Low Stock' : 'Healthy' },
        ];
        if (dateFrom || dateTo) {
            summaryFields.push({ label: 'Period', value: `${dateFrom || 'Start'} to ${dateTo || 'End'}` });
        }
        
        let yPos = 52;
        doc.setFontSize(9);
        summaryFields.forEach(field => {
            doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
            doc.text(field.label, 15, yPos);
            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
            doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
            doc.setDrawColor(243, 244, 246); doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
            yPos += 10;
        });

        // ── 4. Data Table ──
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        const tableColumn = ["VENDOR", "DATE", "RECEIVED", "AVAILABLE", "PRICE/BOX", "TOTAL VALUE", "STATUS"];
        const tableRows = filteredLots.map(lot => [
            lot.vendor,
            formatDate(lot.receivedDate),
            lot.quantityReceived.toString(),
            lot.quantityAvailable.toString(),
            `${lot.pricePerBox.toLocaleString()} Rwf`,
            `${(lot.quantityReceived * lot.pricePerBox).toLocaleString()} Rwf`,
            lot.status === 'active' ? 'Active' : 'Depleted'
        ]);

        autoTable(doc, {
            startY: yPos + 10,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: commonHeadStyles,
            bodyStyles: commonBodyStyles,
            alternateRowStyles,
            margin: { left: 15, right: 15, bottom: 30 }
        });

        // ── Add page numbers ──
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }

        doc.save(`Packaging_Stock_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [lotsRes, summaryRes] = await Promise.all([
                api.get('/packaging'),
                api.get('/packaging/summary'),
            ]);
            setLots(lotsRes.data || []);
            setSummary(summaryRes.data || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleReceive = async () => {
        if (!form.vendor || !form.pricePerBox || !form.quantityReceived || !form.receivedDate) {
            showToast('Validation Error', 'All fields except notes are required.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/packaging', {
                vendor: form.vendor,
                pricePerBox: parseFloat(form.pricePerBox),
                quantityReceived: parseInt(form.quantityReceived),
                receivedDate: form.receivedDate,
                notes: form.notes,
            });
            showToast('Stock Received', `${form.quantityReceived} boxes from ${form.vendor} added to stock.`);
            setForm({ vendor: '', pricePerBox: '', quantityReceived: '', receivedDate: '', notes: '' });
            setShowForm(false);
            fetchAll();
        } catch (err: any) {
            showToast('Error', err?.message || 'Failed to record stock.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLotDelete = async () => {
        if (!lotToDelete) return;
        try {
            await api.delete(`/packaging/${lotToDelete._id}`);
            showToast('Success', 'Packaging stock deleted successfully.');
            setLotToDelete(null);
            fetchAll();
        } catch (err: any) {
            showToast('Error', err?.message || 'Failed to delete stock.');
        }
    };

    const CRITICAL_THRESHOLD = 50;
    const LOW_THRESHOLD = 500;

    const stockStatus = 
        !summary ? 'healthy' :
        summary.totalAvailableBoxes === 0 ? 'empty' :
        summary.totalAvailableBoxes < CRITICAL_THRESHOLD ? 'critical' :
        summary.totalAvailableBoxes < LOW_THRESHOLD ? 'low' : 'healthy';

    const statusConfig = {
        empty: {
            label: 'Out of Stock',
            sub: 'No boxes available — batches blocked',
            card: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40',
            text: 'text-red-600 dark:text-red-400',
            dot: 'bg-red-500',
            pulse: true,
        },
        critical: {
            label: 'Critical — Reorder Now',
            sub: `Only ${summary?.totalAvailableBoxes} boxes left`,
            card: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40',
            text: 'text-red-600 dark:text-red-400',
            dot: 'bg-red-500',
            pulse: true,
        },
        low: {
            label: 'Low Stock',
            sub: `${summary?.totalAvailableBoxes} boxes — reorder soon`,
            card: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/40',
            text: 'text-amber-600 dark:text-amber-400',
            dot: 'bg-amber-500',
            pulse: false,
        },
        healthy: {
            label: 'Healthy',
            sub: 'Sufficient stock available',
            card: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/40',
            text: 'text-green-600 dark:text-green-400',
            dot: 'bg-green-500',
            pulse: false,
        },
    } as const;

    const cfg = statusConfig[stockStatus];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package2 size={20} className="text-purple-600" />
                        Packaging Stock
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Track export box inventory and deliveries</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* FILTER DATE FROM */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-sm">
                        <Calendar className="text-gray-400" size={14} />
                        <span className="text-gray-500 font-medium">From:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent focus:outline-none text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    {/* FILTER DATE TO */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-sm">
                        <span className="text-gray-500 font-medium">To:</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent focus:outline-none text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    {/* EXPORT DROPDOWN */}
                    <div className="relative">
                        <button
                            onClick={exportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download size={16} />
                            Export
                            
                        </button>
                        
                    </div>

                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} /> Receive New Stock
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500 mb-1">Total Available</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.totalAvailableBoxes.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">boxes in stock</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500 mb-1">Avg Price / Box</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.averagePricePerBox.toLocaleString()} Rwf
                        </p>
                        <p className="text-xs text-gray-400 mt-1">weighted average</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${cfg.card}`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Stock Status</p>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`relative flex h-2.5 w-2.5`}>
                                {cfg.pulse && (
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
                                )}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                            </span>
                            <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
                        </div>
                        <p className="text-xs text-gray-400">{cfg.sub}</p>
                        {(stockStatus === 'empty' || stockStatus === 'critical' || stockStatus === 'low') && (
                            <button
                                onClick={() => setShowForm(true)}
                                className={`mt-3 text-xs font-bold underline underline-offset-2 ${cfg.text}`}
                            >
                                + Receive new stock
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Receive form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Record New Delivery</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Vendor / Brand *</label>
                            <input type="text" value={form.vendor}
                                onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                                placeholder="e.g. PackRight Ltd"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Price per Box (Rwf) *</label>
                            <input type="number" value={form.pricePerBox}
                                onChange={e => setForm(p => ({ ...p, pricePerBox: e.target.value }))}
                                placeholder="e.g. 500"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Quantity Received *</label>
                            <input type="number" value={form.quantityReceived}
                                onChange={e => setForm(p => ({ ...p, quantityReceived: e.target.value }))}
                                placeholder="e.g. 500"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Received Date *</label>
                            <input type="date" value={form.receivedDate}
                                onChange={e => setForm(p => ({ ...p, receivedDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes (optional)</label>
                            <input type="text" value={form.notes}
                                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="e.g. Carton boxes 40x30x20cm"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowForm(false)}
                            className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleReceive} disabled={submitting}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                            {submitting ? 'Saving...' : 'Record Delivery'}
                        </button>
                    </div>
                </div>
            )}

            {/* Delivery history table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white shrink-0">Delivery History</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* SEARCH (Spot 5) */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search vendor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-48"
                            />
                        </div>

                        {/* VENDOR DROPDOWN */}
                        <select
                            value={vendorFilter}
                            onChange={(e) => setVendorFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Vendors</option>
                            {Array.from(new Set(lots.map(l => l.vendor))).sort().map(vendor => (
                                <option key={vendor as string} value={vendor as string}>{vendor as string}</option>
                            ))}
                        </select>

                        {/* STATUS FILTER (Spot 2) */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="depleted">Depleted</option>
                        </select>
                    </div>
                </div>
                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
                ) : lots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No stock recorded yet.</p>
                ) : filteredLots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No deliveries match your filters.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wide">
                                <th className="text-left px-5 py-3">Vendor</th>
                                <th className="text-left px-5 py-3">Date</th>
                                <th className="text-right px-5 py-3">Received</th>
                                <th className="text-right px-5 py-3">Available</th>
                                <th className="text-right px-5 py-3">Price/Box</th>
                                <th className="text-right px-5 py-3">Total Value</th>
                                <th className="text-left px-5 py-3">Status</th>
                                <th className="text-center px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        {filteredLots.map((lot: any) => {
                            const totalMoneyValue = lot.quantityReceived * lot.pricePerBox;

                            return (
                                <tbody key={lot._id} className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {/* Main lot row */}
                                    <tr
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLot(lot)}
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white">{lot.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">
                                            {new Date(lot.receivedDate).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono">
                                            {lot.quantityReceived.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono font-bold">
                                            {lot.quantityAvailable.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono">
                                            {lot.pricePerBox.toLocaleString()} Rwf
                                        </td>
                                        <td className="px-5 py-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                            {totalMoneyValue.toLocaleString()} Rwf
                                        </td>
                                        <td className="px-5 py-3">
                                            {(() => {
                                                if (lot.quantityAvailable === 0 || lot.status === 'depleted') {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                            Depleted
                                                        </span>
                                                    );
                                                }
                                                if (lot.quantityAvailable < CRITICAL_THRESHOLD) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center w-fit gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                            Critical
                                                        </span>
                                                    );
                                                }
                                                if (lot.quantityAvailable < LOW_THRESHOLD) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                            Low
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Active
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingLot(lot); }}
                                                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                                    title="Edit Delivery"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setLotToDelete(lot); }}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Delete Delivery"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                </tbody>
                            );
                        })}
                    </table>
                )}
            </div>

            {selectedLot && (
                <PackagingLotDetailModal
                    lot={selectedLot}
                    onClose={() => setSelectedLot(null)}
                />
            )}

            {editingLot && (
                <EditPackagingLotModal
                    lot={editingLot}
                    onClose={() => setEditingLot(null)}
                    onSuccess={fetchAll}
                />
            )}

            <DeleteConfirmationModal
                isOpen={!!lotToDelete}
                onClose={() => setLotToDelete(null)}
                onConfirm={handleLotDelete}
                vendorName={lotToDelete?.vendor || ''}
            />
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, vendorName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, vendorName: string }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <h3 className="text-base font-bold text-red-800 dark:text-red-300">Delete Packaging Stock</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Are you sure you want to delete the packaging stock from <strong className="text-gray-900 dark:text-white">{vendorName}</strong>? This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-md"
                        >
                            Delete Stock
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PackagingStockPage;
