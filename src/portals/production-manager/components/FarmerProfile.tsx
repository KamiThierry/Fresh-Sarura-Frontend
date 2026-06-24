import { useState, useEffect } from 'react';
import { MapPin, Leaf, Download, ChevronDown, FileSpreadsheet, FileText, ArrowLeft, Phone, Mail, Pencil, ShieldOff, Ruler, Star, BadgeCheck, Sprout, PackageCheck, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { Farmer } from '@/types';
import EditFarmerModal from './EditFarmerModal';
import DeleteFarmerModal from './DeleteFarmerModal';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

interface FarmerProfileProps {
  farmer: Farmer;
  onBack: () => void;
  allFarmers?: Farmer[];
  allStock?: any[];
}



const STATUS_STYLE: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Auditing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex-shrink-0">{icon}</div>
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</div>
    </div>
  </div>
);

const FarmerProfile = ({ farmer: initialFarmer, onBack, allFarmers = [], allStock = [] }: FarmerProfileProps) => {
  // Local copy so edits update the UI immediately without a full page refetch
  const [farmer, setFarmer] = useState<Farmer>(initialFarmer);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [cycles, setCycles] = useState<any[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);

  // ── Recent Harvests from Real Declarations ──
  const realHarvests = allStock
    .filter((d: any) => {
      const fid = d.farmerId?._id ?? d.farmerId;
      return String(fid) === String(farmer._id);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const harvests = realHarvests.map((d: any) => ({
    date: new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    crop: d.cropName || 'N/A',
    qty: `${(d.estimatedWeightKg || 0).toLocaleString()} kg`,
    status: d.status || 'Pending'
  }));

  // ── Performance metrics ──
  // Total kg declared by this farmer across all harvest declarations
  const farmerDeclarations = allStock.filter((d: any) => {
    const fid = d.farmerId?._id ?? d.farmerId;
    return String(fid) === String(farmer._id);
  });
  const totalSuppliedKg = farmerDeclarations.reduce((s: number, d: any) => s + (d.estimatedWeightKg || 0), 0);

  // Supply rank among all farmers
  const farmerVolumes = allFarmers.map((f) => ({
    id: f._id,
    kg: allStock
      .filter((d: any) => {
        const fid = d.farmerId?._id ?? d.farmerId;
        return String(fid) === String(f._id);
      })
      .reduce((s: number, d: any) => s + (d.estimatedWeightKg || 0), 0),
  })).sort((a, b) => b.kg - a.kg);
  const rankIndex = farmerVolumes.findIndex((r) => String(r.id) === String(farmer._id));
  const supplyRank = rankIndex >= 0 ? rankIndex + 1 : null;

  // Star rating from supply vs capacity (1–5 stars)
  const capacityKg = (farmer.production_capacity_tons || 0) * 1000;
  const ratingRaw = capacityKg > 0 ? Math.min(totalSuppliedKg / capacityKg, 1) * 5 : 0;
  const rating = Math.max(1, Math.round(ratingRaw * 2) / 2); // round to nearest 0.5

  // Sync if parent swaps to a different farmer
  useEffect(() => { setFarmer(initialFarmer); }, [initialFarmer._id]);

  // Fetch real crop cycles assigned to this farmer
  useEffect(() => {
    setCyclesLoading(true);
    api.get(`/crop-cycles?farmer_id=${farmer._id}`)
      .then((res) => setCycles(res.data ?? []))
      .catch((err) => console.error('Failed to load crop cycles:', err))
      .finally(() => setCyclesLoading(false));
  }, [farmer._id]);

  // ─── Export Logic (Excel) ───
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Helper to make sheet
    const makeSheet = (headers: string[], rows: (string | number)[][]) => {
      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
        return { wch: Math.min(maxLen + 4, 40) };
      });
      return ws;
    };

    // Sheet 1: Farmer Profile
    const profileWs = makeSheet(
      ['Field', 'Value'],
      [
        ['Full Name', farmer.full_name],
        ['Farm Name', farmer.farm_name || 'Individual'],
        ['National ID', farmer.national_id],
        ['Phone', farmer.phone],
        ['Email', farmer.email || 'N/A'],
        ['District', farmer.district],
        ['Sector', farmer.sector],
        ['Cell', farmer.cell],
        ['Village', farmer.village],
        ['Main Crops', farmer.produce_types.join(', ')],
        ['Farm Size', `${farmer.farm_size_hectares} Ha`],
        ['Production Capacity', `${farmer.production_capacity_tons} Tons`],
        ['Status', farmer.status],
        ['Date Joined', formatDate(farmer.createdAt || farmer.created_at || (farmer._id && farmer._id.length === 24 ? new Date(parseInt(farmer._id.substring(0, 8), 16) * 1000) : ''))],
        ['Total Supplied', `${totalSuppliedKg.toLocaleString()} kg`],
        ['Supply Rank', supplyRank ? `#${supplyRank}` : 'N/A'],
      ]
    );
    XLSX.utils.book_append_sheet(wb, profileWs, 'Farmer Profile');

    // Sheet 2: Active Crop Cycles
    const cycleWs = makeSheet(
      ['Block', 'Crop', 'Planted', 'Yield Goal (kg)', 'Status'],
      cycles.map(c => [
        c.block_name,
        c.crop_name,
        c.planting_date ? new Date(c.planting_date).toLocaleDateString() : 'N/A',
        c.yield_goal_kg || 0,
        c.status
      ])
    );
    XLSX.utils.book_append_sheet(wb, cycleWs, 'Crop Cycles');

    // Sheet 3: Recent Harvests
    const harvestWs = makeSheet(
      ['Date', 'Crop', 'Quantity (kg)', 'Status'],
      realHarvests.map(h => [
        new Date(h.createdAt).toLocaleDateString(),
        h.cropName,
        h.estimatedWeightKg,
        h.status
      ])
    );
    XLSX.utils.book_append_sheet(wb, harvestWs, 'Harvest Records');

    XLSX.writeFile(wb, `Sarura_Profile_${farmer.full_name.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportOpen(false);
  };

  // ─── Export Logic (PDF) ───
  const handleExportPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const toTitleCase = (str: string) => str?.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A';

    // 1. Header
    try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch { }
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

    // 2. Title & Summary
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`INDIVIDUAL FARMER PROFILE: ${farmer.full_name.toUpperCase()}`, 15, 42);

    const summaryFields = [
      { label: 'Farm Name / Cooperative', value: toTitleCase(farmer.farm_name || 'Individual') },
      { label: 'Physical Location', value: `${toTitleCase(farmer.district)}, ${toTitleCase(farmer.sector)}\n${toTitleCase(farmer.cell)}, ${toTitleCase(farmer.village)}` },
      { label: 'Contact Information', value: `${farmer.phone} | ${farmer.email}` },
      { label: 'National ID', value: farmer.national_id },
      { label: 'Date Joined Network', value: formatDate(farmer.createdAt || farmer.created_at || (farmer._id && farmer._id.length === 24 ? new Date(parseInt(farmer._id.substring(0, 8), 16) * 1000) : '')) },
      { label: 'Total Volume Supplied', value: totalSuppliedKg >= 1000 ? `${(totalSuppliedKg / 1000).toFixed(2)} Tons` : `${totalSuppliedKg.toLocaleString()} kg` },
      { label: 'Supply Network Rank', value: supplyRank ? `#${supplyRank} of ${allFarmers.length} farmers` : '—' }
    ];

    let yPos = 52;
    doc.setFontSize(9);
    summaryFields.forEach(field => {
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
      doc.text(field.label, 15, yPos);
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
      doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
      doc.setDrawColor(243, 244, 246);
      doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
      yPos += 10;
    });

    const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
    const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
    const alternateRowStyles: any = { fillColor: [249, 250, 251] };

    // 3. Farm Specifications Table
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
    doc.text('FARM SPECIFICATIONS', 15, yPos + 5);

    autoTable(doc, {
      startY: yPos + 10,
      head: [['SPECIFICATION', 'DETAILS']],
      body: [
        ['Main Crops Cultivated', (farmer.produce_types || []).join(', ')],
        ['Total Land Size', `${farmer.farm_size_hectares} Hectares`],
        ['Production Capacity', `${farmer.production_capacity_tons} Tons / Season`],
        ['Farm Name / ID', farmer.farm_name || 'Individual Plot'],
      ],
      theme: 'striped',
      headStyles: commonHeadStyles,
      bodyStyles: commonBodyStyles,
      alternateRowStyles,
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 4. Active Crop Cycles Table
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('ACTIVE CROP CYCLES', 15, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['BLOCK', 'CROP NAME', 'PLANTING DATE', 'YIELD GOAL', 'STATUS']],
      body: cycles.map(c => [
        toTitleCase(c.block_name),
        toTitleCase(c.crop_name),
        c.planting_date ? new Date(c.planting_date).toLocaleDateString('en-GB') : '—',
        `${(c.yield_goal_kg || 0).toLocaleString()} kg`,
        toTitleCase(c.status)
      ]),
      theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 5. Recent Harvests Table
    if (yPos > 240) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('RECENT HARVEST DECLARATIONS', 15, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['DECLARATION DATE', 'CROP', 'DECLARED QTY', 'CURRENT STATUS']],
      body: realHarvests.slice(0, 10).map(h => [
        new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        toTitleCase(h.cropName),
        `${(h.estimatedWeightKg || 0).toLocaleString()} kg`,
        toTitleCase(h.status)
      ]),
      theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
      margin: { left: 15, right: 15, bottom: 30 },
    });

    // 6. System Insights
    let lastY = (doc as any).lastAutoTable?.finalY || yPos;
    if (lastY > 240) { doc.addPage(); lastY = 20; }
    
    doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
    
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
    doc.text('• This profile aggregates data across crop planning, harvesting, and QC modules.', 15, lastY + 25);
    doc.text(`• Total Active Cycles: ${cycles.filter(c => c.status === 'Active' || c.status === 'In_progress').length}`, 15, lastY + 31);
    doc.text(`• Compliance Status: ${farmer.status === 'Active' ? 'Fully compliant and authorized for supply.' : 'Currently inactive or under review.'}`, 15, lastY + 37);

    // 7. Footer
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

    doc.save(`Sarura_FarmerProfile_${farmer.full_name.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportOpen(false);
  };


  return (
    <div className="space-y-6 animate-fade-in">

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
      >
        <ArrowLeft size={16} />
        Back to Farmer Directory
      </button>

      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-green-600 dark:text-green-400">
              {farmer.full_name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{farmer.full_name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[farmer.status]}`}>
                {farmer.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={12} /> {farmer.district}, {farmer.sector}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm font-medium"
            >
              <Download size={15} />
              Export Data
              
            </button>

            
          </div>

          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil size={15} /> Edit Profile
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <ShieldOff size={15} /> Account Actions
          </button>
        </div>
      </div>

      {/* 3-column info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Identity & Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Identity &amp; Contact</h3>
          <InfoRow icon={<BadgeCheck size={15} className="text-blue-500" />} label="National ID"
            value={<span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{farmer.national_id}</span>} />
          <InfoRow icon={<Phone size={15} className="text-green-500" />} label="Phone" value={farmer.phone} />
          <InfoRow icon={<Mail size={15} className="text-purple-500" />} label="Email" value={<span className="text-blue-600 dark:text-blue-400">{farmer.email}</span>} />
        </div>

        {/* Farm Specifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Farm Specifications</h3>
          <InfoRow icon={<MapPin size={15} className="text-orange-500" />} label="Physical Address"
            value={
              <div className="flex flex-col">
                <span className="text-xs leading-relaxed">{farmer.district}, {farmer.sector}</span>
                <span className="text-[10px] text-gray-500">Cell: {farmer.cell}, Village: {farmer.village}</span>
              </div>
            } />
          <InfoRow icon={<Leaf size={15} className="text-green-500" />} label="Main Crop" value={farmer.produce_types.join(', ')} />
          <InfoRow icon={<Ruler size={15} className="text-gray-500" />} label="Land Size" value={`${farmer.farm_size_hectares} Ha`} />
        </div>

        {/* Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Performance</h3>

          {/* Star Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={15}
                  className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : i < rating ? 'text-yellow-400 fill-yellow-200' : 'text-gray-200 fill-gray-200 dark:text-gray-600 dark:fill-gray-600'}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-medium">{rating.toFixed(1)} / 5</span>
          </div>

          {/* Metric rows */}
          <div className="space-y-3 pt-1">
            {[
              { label: 'Total Supplied', value: totalSuppliedKg >= 1000 ? `${(totalSuppliedKg / 1000).toFixed(2)} Tons` : `${totalSuppliedKg.toLocaleString()} kg` },
              { label: 'Active Crop Cycles', value: cyclesLoading ? '…' : String(cycles.filter(c => c.status === 'active' || c.status === 'in_progress').length) },
              { label: 'Yield Goal (Current)', value: (() => { const ac = cycles.find(c => c.status === 'active' || c.status === 'in_progress'); return ac?.yield_goal_kg ? `${ac.yield_goal_kg.toLocaleString()} kg` : '—'; })() },
              { label: 'Supply Rank', value: supplyRank ? `#${supplyRank} of ${allFarmers.length} farmers` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational data — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Active Crop Cycles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <Sprout size={15} className="text-green-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Crop Cycles</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
              {cyclesLoading ? '…' : `${cycles.length} active`}
            </span>
          </div>
          {cyclesLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading cycles…</span>
            </div>
          ) : cycles.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 text-left">Block</th>
                  <th className="px-5 py-2.5 text-left">Crop</th>
                  <th className="px-5 py-2.5 text-left">Planted</th>
                  <th className="px-5 py-2.5 text-left">Yield Goal</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {cycles.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">{c.block_name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{c.crop_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {c.planting_date ? new Date(c.planting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200">
                      {c.yield_goal_kg != null ? `${c.yield_goal_kg.toLocaleString()} kg` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse' :
                        c.status === 'completed'  ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {c.status === 'active' ? '● Active' : c.status === 'in_progress' ? '◉ In Progress' : c.status === 'completed' ? '✓ Done' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-8 text-sm text-gray-400 text-center italic">No active crop cycles</p>
          )}
        </div>

        {/* Recent Harvests */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <PackageCheck size={15} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Harvests</h3>
            <span className="ml-auto text-xs text-gray-400">Last 3 deliveries</span>
          </div>
          {harvests.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Crop</th>
                  <th className="px-5 py-2.5 text-left">Quantity</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {harvests.slice(0, 3).map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{h.date}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{h.crop}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200">{h.qty}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.status === 'PickedUp' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-8 text-sm text-gray-400 text-center italic">No harvest records found</p>
          )}
        </div>
      </div>

      {/* Edit Farmer Modal */}
      <EditFarmerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        farmer={farmer}
        onSaved={(updated) => {
          setFarmer(updated as Farmer);
          setIsEditOpen(false);
        }}
      />

      {/* Delete / Suspend Modal */}
      <DeleteFarmerModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        farmer={farmer}
        onSuspended={(updated) => {
          setFarmer(updated as Farmer);
          setIsDeleteOpen(false);
        }}
        onReactivated={(updated) => {
          setFarmer(updated as Farmer);
          setIsDeleteOpen(false);
        }}
        onDeleted={() => {
          setIsDeleteOpen(false);
          onBack();
        }}
      />

    </div>
  );
};

export default FarmerProfile;
