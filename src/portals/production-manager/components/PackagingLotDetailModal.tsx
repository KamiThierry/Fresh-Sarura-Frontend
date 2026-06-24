import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Package2, Download, Calendar, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import { formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

const PackagingLotDetailModal = ({ lot, onClose }: { lot: any; onClose: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const totalConsumed = lot.quantityReceived - lot.quantityAvailable;
    const totalValue = lot.quantityReceived * lot.pricePerBox;
    const usedValue = totalConsumed * lot.pricePerBox;
    const remainingValue = lot.quantityAvailable * lot.pricePerBox;

    const filteredLog = useMemo(() => {
        if (!lot.consumptionLog) return [];
        return lot.consumptionLog.filter((entry: any) => {
            const matchesSearch = !searchTerm || entry.exportBatchRef?.toLowerCase().includes(searchTerm.toLowerCase());
            const entryDate = new Date(entry.consumedAt);
            entryDate.setHours(0,0,0,0);
            
            let matchesStart = true;
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0,0,0,0);
                matchesStart = entryDate >= sDate;
            }
            
            let matchesEnd = true;
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(0,0,0,0);
                matchesEnd = entryDate <= eDate;
            }

            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [lot.consumptionLog, searchTerm, startDate, endDate]);

    const filteredBoxesUsed = filteredLog.reduce((sum: number, entry: any) => sum + (entry.boxesUsed || 0), 0);
    const filteredCostUsed = filteredBoxesUsed * lot.pricePerBox;


    const handleExportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDateTime(new Date());

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
        doc.text(`PACKAGING CONSUMPTION LEDGER — ${lot.vendor.toUpperCase()}`, 15, 42);

        // Summary
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal'); doc.text('Total Lot Value', 15, 52);
        doc.setFont('helvetica', 'bold'); doc.text(`${totalValue.toLocaleString()} Rwf`, 60, 52);
        
        doc.setFont('helvetica', 'normal'); doc.text('Used Value', 15, 58);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38); doc.text(`${usedValue.toLocaleString()} Rwf`, 60, 58);
        
        doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39); doc.text('Remaining Value', 15, 64);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74); doc.text(`${remainingValue.toLocaleString()} Rwf`, 60, 64);

        // Table
        doc.setTextColor(17, 24, 39);
        autoTable(doc, {
            startY: 72,
            head: [['DATE', 'TIME', 'BATCH / CLIENT', 'BOXES USED', 'COST']],
            body: filteredLog.map((entry: any) => [
                new Date(entry.consumedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                new Date(entry.consumedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                entry.exportBatchRef || '—',
                `-${entry.boxesUsed.toLocaleString()}`,
                `-${(entry.boxesUsed * lot.pricePerBox).toLocaleString()} Rwf`
            ]),
            foot: [[
                '', 
                '', 
                (searchTerm || startDate || endDate) ? 'FILTERED TOTAL' : 'TOTAL CONSUMED', 
                `-${filteredBoxesUsed.toLocaleString()}`, 
                `-${filteredCostUsed.toLocaleString()} Rwf`
            ]],
            theme: 'striped',
            headStyles: { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [147, 51, 234] }, // Purple matching modal
            bodyStyles: { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } },
            footStyles: { fillColor: [249, 250, 251], fontSize: 8.5, fontStyle: 'bold', cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            didParseCell: (data: any) => {
                if (data.section === 'foot') {
                    if (data.column.index === 4) {
                        data.cell.styles.textColor = [220, 38, 38]; // red
                    } else {
                        data.cell.styles.textColor = [17, 24, 39]; // dark
                    }
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 72;
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        doc.text(`Notes: ${lot.notes || '—'}`, 15, finalY + 10);

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

        doc.save(`FreshSarura_Packaging_${lot.vendor.replace(/\s/g, '_')}_Ledger.pdf`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/10 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <Package2 size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {lot.vendor}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Received {new Date(lot.receivedDate).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'long', year: 'numeric'
                                })} · {lot.pricePerBox.toLocaleString()} Rwf/box
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            lot.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                            {lot.status === 'active' ? 'Active' : 'Depleted'}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Financial summary cards */}
                <div className="grid grid-cols-3 gap-0 border-b border-gray-100 dark:border-gray-700">
                    <div className="px-6 py-4 border-r border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Total Lot Value</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {totalValue.toLocaleString()} Rwf
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                            {lot.quantityReceived.toLocaleString()} boxes × {lot.pricePerBox.toLocaleString()} Rwf
                        </p>
                    </div>
                    <div className="px-6 py-4 border-r border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Used Value</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                            {usedValue.toLocaleString()} Rwf
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                            {totalConsumed.toLocaleString()} boxes consumed
                        </p>
                    </div>
                    <div className="px-6 py-4">
                        <p className="text-xs text-gray-400 mb-1">Remaining Value</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {remainingValue.toLocaleString()} Rwf
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                            {lot.quantityAvailable.toLocaleString()} boxes left
                        </p>
                    </div>
                </div>

                {/* Consumption ledger */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                            Consumption History
                            {filteredLog.length > 0 && (
                                <span className="ml-2 text-gray-400 font-normal normal-case">
                                    {filteredLog.length} entry{filteredLog.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search batch/client..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-40"
                                />
                            </div>

                            {/* Date Filter */}
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5">
                                <Calendar size={13} className="text-purple-500 flex-shrink-0" />
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="text-[11px] text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none cursor-pointer w-[90px]" />
                                <span className="text-[10px] text-gray-400 font-medium">-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="text-[11px] text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none cursor-pointer w-[90px]" />
                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                        className="ml-1 text-[10px] text-purple-600 hover:text-purple-700 font-bold transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Export dropdown */}
                            <div className="relative">
                                <button onClick={handleExportPDF}
                                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                    <Download size={13} /> Export
                                </button>
                                
                            </div>
                        </div>
                    </div>

                    {!filteredLog.length ? (
                        <div className="py-16 text-center">
                            <Package2 size={28} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm font-medium text-gray-500">No boxes consumed yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {(searchTerm || startDate || endDate) ? 'No entries match your filters.' : 'Consumption entries will appear here when export batches are created.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 uppercase tracking-wide">
                                    <th className="text-left px-6 py-3">Date & Time</th>
                                    <th className="text-left px-6 py-3">Batch / Client</th>
                                    <th className="text-right px-6 py-3">Boxes Used</th>
                                    <th className="text-right px-6 py-3">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {filteredLog.map((entry: any, idx: number) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                    >
                                        <td className="px-6 py-3 text-gray-500">
                                            {new Date(entry.consumedAt).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                            <span className="ml-2 text-gray-400">
                                                {new Date(entry.consumedAt).toLocaleTimeString('en-GB', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                                            {entry.exportBatchRef || '—'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                                            -{entry.boxesUsed.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                                            -{(entry.boxesUsed * lot.pricePerBox).toLocaleString()} Rwf
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Running total footer */}
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-900/40">
                                    <td colSpan={2} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        {(searchTerm || startDate || endDate) ? 'Filtered total' : 'Total consumed'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                                        -{filteredBoxesUsed.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                                        -{filteredCostUsed.toLocaleString()} Rwf
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                        Notes: {lot.notes || '—'}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PackagingLotDetailModal;
