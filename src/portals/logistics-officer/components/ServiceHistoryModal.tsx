import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wrench, ClipboardList, Loader2, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

interface ServiceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: any;
    logs: any[];
    loading: boolean;
    onLogNew: () => void;
}

const ServiceHistoryModal = ({ isOpen, onClose, vehicle, logs, loading, onLogNew }: ServiceHistoryModalProps) => {
    const [isExportOpen, setIsExportOpen] = useState(false);

    if (!isOpen || !vehicle) return null;

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const headers = ['Date', 'Reason', 'Status', 'Estimated Cost (RWF)', 'Expected Return', 'Actual Return', 'Logged By'];
        const rows = logs.map(log => [
            formatDate(log.createdAt),
            log.reason,
            log.status,
            log.estimatedCostRwf || 0,
            log.expectedReturnDate ? formatDate(log.expectedReturnDate) : '—',
            log.actualReturnDate ? formatDateTime(log.actualReturnDate) : '—',
            log.loggedBy?.name || 'System Admin'
        ]);

        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        ws['!cols'] = headers.map((h, i) => ({
            wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2
        }));

        XLSX.utils.book_append_sheet(wb, ws, 'Service History');
        XLSX.writeFile(wb, `ServiceHistory_${vehicle.plateNumber}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

        // 1. Header
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch (e) {}
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
        doc.text(`VEHICLE SERVICE HISTORY REPORT: ${vehicle.plateNumber}`, 15, 42);

        // 3. Summary Fields
        const summaryFields = [
            { label: 'Vehicle Plate', value: vehicle.plateNumber },
            { label: 'Vehicle Type', value: vehicle.type },
            { label: 'Total Service Events', value: String(logs.length) },
            { label: 'Open Maintenance', value: String(logs.filter(l => l.status === 'Open').length) },
            { label: 'Total Est. Cost', value: `RWF ${logs.reduce((s, l) => s + (l.estimatedCostRwf || 0), 0).toLocaleString()}` },
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
        autoTable(doc, {
            startY: yPos + 10,
            head: [['DATE', 'REASON', 'STATUS', 'COST (RWF)', 'RETURNED']],
            body: logs.map(l => [
                formatDate(l.createdAt),
                l.reason,
                l.status,
                (l.estimatedCostRwf || 0).toLocaleString(),
                l.actualReturnDate ? formatDate(l.actualReturnDate) : (l.expectedReturnDate ? `Est: ${formatDate(l.expectedReturnDate)}` : '—')
            ]),
            theme: 'striped',
            headStyles: { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [245, 158, 11] }, // Amber for maintenance
            bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
            margin: { left: 15, right: 15, bottom: 30 },
        });

        // 5. System Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report details vehicle service and maintenance history.', 15, lastY + 25);
        
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

        doc.save(`ServiceHistory_${vehicle.plateNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/20 p-2.5 rounded-xl text-amber-600 dark:text-amber-400">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Service History</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono font-semibold">
                                {vehicle.plateNumber} — {vehicle.type}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-Header / Quick Action */}
                <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Past maintenance records and service logs.
                    </p>
                    <div className="flex items-center gap-3">
                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download size={14} /> Export
                            </button>
                        </div>

                        <button
                            onClick={onLogNew}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                        >
                            <Wrench size={14} />
                            Log New Service
                        </button>
                    </div>
                </div>

                {/* Logs list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 size={32} className="animate-spin text-amber-500" />
                            <p className="text-sm font-medium text-gray-500">Retrieving service history...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20">
                            <ClipboardList size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                            <p className="text-lg font-bold text-gray-400 dark:text-gray-600">No service records found</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">This vehicle has no recorded maintenance events.</p>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={log._id}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500">
                                            #{logs.length - i}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            log.status === 'Open'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200/50'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                                        <ClipboardList size={12} />
                                        {new Date(log.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </span>
                                </div>

                                <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                                    {log.reason}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Est. Return</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                                            {log.expectedReturnDate
                                                ? new Date(log.expectedReturnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Estimated Cost</p>
                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                            {log.estimatedCostRwf
                                                ? `RWF ${log.estimatedCostRwf.toLocaleString()}`
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Logged By</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                                            {log.loggedBy?.name || 'System Admin'}
                                        </p>
                                    </div>
                                    {log.actualReturnDate && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 col-span-full rounded-xl px-4 py-2 flex items-center justify-between">
                                            <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-black">Actual Return Date</p>
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                                {new Date(log.actualReturnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold rounded-xl transition-all"
                    >
                        Close History
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ServiceHistoryModal;
