import { useState, useEffect, useCallback } from 'react';
import { Truck, PackageCheck, Clock, CheckCircle2, Loader2, RefreshCw, Search, Filter, ChevronDown, Users, Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { api } from '../../../lib/api';
import LogPickupModal from '../components/LogPickupModal';
import { useToastContext } from '@/context/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

type Declaration = {
  _id: string;
  cropName: string;
  estimatedWeightKg: number;
  farmName: string;
  notes: string;
  status: 'Pending' | 'PickedUp';
  createdAt: string;
  declaredBy: { name: string };
  farmerId: { full_name: string; district: string };
};

const statusStyles = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PickedUp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const PendingPickups = () => {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'PickedUp'>('All');
  const [farmerFilter, setFarmerFilter] = useState('All');
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3); // Default to last 3 months
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToastContext();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/harvest-declarations');
      setDeclarations(res.data);
    } catch (err) {
      console.error('Failed to fetch declarations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeclarations(); }, [fetchDeclarations]);

  const filtered = declarations.filter((d: Declaration) => {
    const name = d.farmName || d.farmerId?.full_name || '—';
    const matchSearch = d.cropName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.declaredBy?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchFarmer = farmerFilter === 'All' || name === farmerFilter;

    let matchDate = true;
    if (startDate && endDate) {
      const createdDateStr = new Date(d.createdAt).toISOString().split('T')[0];
      matchDate = createdDateStr >= startDate && createdDateStr <= endDate;
    }

    return matchSearch && matchStatus && matchFarmer && matchDate;
  });

  const uniqueFarmers = Array.from(new Set(declarations.map((d: Declaration) => d.farmName || d.farmerId?.full_name || '—'))).filter(f => f !== '—').sort();
  const pendingCount = filtered.filter((d: Declaration) => d.status === 'Pending').length;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleLogPickup = (declaration: Declaration) => {
    setSelectedDeclaration(declaration);
    setIsModalOpen(true);
  };

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Crop', 'Farm / Farmer', 'Est. Weight (kg)', 'Declared By', 'Date', 'Status', 'Notes'];
    const rows = filtered.map((d: Declaration) => [
      d.cropName,
      d.farmName || d.farmerId?.full_name || '—',
      d.estimatedWeightKg,
      d.declaredBy?.name || '—',
      formatDate(d.createdAt),
      d.status === 'PickedUp' ? 'Picked Up' : 'Pending',
      d.notes || ''
    ]);

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Column widths
    ws['!cols'] = headers.map((h, i) => ({
      wch: Math.max(h.length, ...rows.map((r: any[]) => String(r[i] ?? '').length)) + 2
    }));

    XLSX.utils.book_append_sheet(wb, ws, 'Pending Pickups');
    XLSX.writeFile(wb, `FreshSarura_Pickups_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    doc.text(`HARVEST PICKUP STATUS REPORT`, 15, 42);

    // 3. Summary Fields
    const summaryFields = [
      { label: 'Total Records', value: String(filtered.length) },
      { label: 'Pending Pickups', value: String(filtered.filter((d: Declaration) => d.status === 'Pending').length) },
      { label: 'Completed Pickups', value: String(filtered.filter((d: Declaration) => d.status === 'PickedUp').length) },
      { label: 'Total Est. Weight', value: `${filtered.reduce((s: number, d: Declaration) => s + d.estimatedWeightKg, 0).toLocaleString()} kg` },
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
      head: [['CROP', 'FARM / FARMER', 'WEIGHT', 'DECLARED BY', 'DATE', 'STATUS']],
      body: filtered.map((d: Declaration) => [
        toTitleCase(d.cropName),
        toTitleCase(d.farmName || d.farmerId?.full_name || '—'),
        `${d.estimatedWeightKg.toLocaleString()} kg`,
        toTitleCase(d.declaredBy?.name || '—'),
        formatDate(d.createdAt),
        d.status === 'PickedUp' ? 'Picked Up' : 'Pending'
      ]),
      theme: 'striped',
      headStyles: commonHeadStyles,
      bodyStyles: commonBodyStyles,
      alternateRowStyles: alternateRowStyles,
      margin: { left: 15, right: 15, bottom: 30 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const s = String(data.cell.raw).toLowerCase();
          if (s === 'picked up') data.cell.styles.textColor = '#16a34a';
          else if (s === 'pending') data.cell.styles.textColor = '#ea580c';
        }
      }
    });

    // 5. System Insights
    let lastY = (doc as any).lastAutoTable?.finalY || yPos;
    if (lastY > 210) { doc.addPage(); lastY = 20; }
    
    doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
    
    const pending = filtered.filter((d: Declaration) => d.status === 'Pending').length;
    const completionRate = filtered.length ? ((filtered.filter((d: Declaration) => d.status === 'PickedUp').length / filtered.length) * 100).toFixed(1) : '0';
    const totalWeight = filtered.reduce((s: number, d: Declaration) => s + d.estimatedWeightKg, 0);
    
    doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
    doc.text(`• Completion Status: ${completionRate}% of harvest declarations in this view have been picked up.`, 15, lastY + 23);
    doc.text(`• Backlog Warning: There are ${pending} declarations currently awaiting truck dispatch.`, 15, lastY + 29);
    doc.text(`• Volume Handling: Total volume represented in this report is ${(totalWeight / 1000).toFixed(2)} Tons.`, 15, lastY + 35);
    doc.text(`• Operational Focus: ${filtered.length} unique harvest events tracked across the selected period.`, 15, lastY + 41);

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

    doc.save(`FreshSarura_Pickups_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportOpen(false);
  };

  return (
    <>
      <div className="p-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Pending Pickups
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-amber-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Harvest declarations awaiting truck dispatch and pickup logging.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
              <Calendar size={15} className="text-blue-500 flex-shrink-0" />
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
              onClick={fetchDeclarations}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Total Declarations', value: filtered.length, icon: PackageCheck, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
            { label: 'Pending Pickup', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Picked Up', value: filtered.filter(d => d.status === 'PickedUp').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {s.value}
                  </div>
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
                placeholder="Search crops, farms, farmers..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
            </div>

            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Pickup</option>
                <option value="PickedUp">Picked Up</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>

            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={farmerFilter}
                onChange={e => { setFarmerFilter(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All Farmers</option>
                {uniqueFarmers.map(farmer => (
                  <option key={farmer} value={farmer}>{farmer}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>

            {(searchTerm || statusFilter !== 'All' || farmerFilter !== 'All') && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('All'); setFarmerFilter('All'); setCurrentPage(1); }}
                className="text-xs text-blue-500 hover:text-blue-700 font-bold px-2 flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Truck size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm font-medium">No harvest declarations found.</p>
              <p className="text-gray-400 text-xs mt-1">Farmers will appear here once they declare a harvest ready.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Crop', 'Farm / Farmer', 'Est. Weight', 'Declared By', 'Time', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginated.map((d: Declaration) => (
                    <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{d.cropName}</p>
                        {d.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{d.notes}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.farmName || d.farmerId?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{d.farmerId?.district || ''}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">
                        {d.estimatedWeightKg.toLocaleString()} kg
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {d.declaredBy?.name || '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(d.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[d.status as keyof typeof statusStyles]}`}>
                          {d.status === 'PickedUp' ? 'Picked Up' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {d.status === 'Pending' ? (
                          <button
                            onClick={() => handleLogPickup(d)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            <Truck size={13} /> Log Pickup
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p: number) => (
                  <button 
                    key={p} 
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${p === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      <LogPickupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        declaration={selectedDeclaration ? {
          id: selectedDeclaration._id,
          farm: selectedDeclaration.farmName || selectedDeclaration.farmerId?.full_name || '—',
          crop: selectedDeclaration.cropName,
          weight: selectedDeclaration.estimatedWeightKg,
        } : null}
        onSuccess={() => {
          setIsModalOpen(false);
          showToast(
            'Pickup Logged',
            `The harvest from ${selectedDeclaration?.farmName || selectedDeclaration?.farmerId?.full_name} has been marked as collected.`
          );
          fetchDeclarations();
        }}
      />

    </>
  );
};

export default PendingPickups;
