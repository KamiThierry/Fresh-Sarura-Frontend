import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle, AlertOctagon, TrendingDown, Activity,
    Search, Filter, ChevronDown, RefreshCw
} from 'lucide-react';
import Pagination from '../../shared/component/Pagination';
import { api } from '../../../lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

const MASTER_DEFECT_TYPES = [
    'Bruising (Mechanical)',
    'Pest Damage',
    'Undersized',
];

const QCInsights = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [defectFilter, setDefectFilter] = useState('all');
    const [cropFilter, setCropFilter] = useState('all');
    const [farmerFilter, setFarmerFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const itemsPerPage = 8;

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/processing-batches');
            const data = res.data?.data || res.data || [];
            // Only batches that have gone through QC
            setBatches(data.filter((b: any) =>
                ['QCDone', 'Done', 'Spoiled'].includes(b.status)
            ));
        } catch (err) {
            console.error('Failed to fetch processing batches:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBatches(); }, []);

    // ── Derived Stats & Analytics ──────────────────────────────────
    const stats = useMemo(() => {
        const dMap: Record<string, { count: number; rejectedKg: number }> = {};
        MASTER_DEFECT_TYPES.forEach(d => {
            dMap[d] = { count: 0, rejectedKg: 0 };
        });

        let received = 0;
        let rejected = 0;
        let gACount = 0;

        batches.forEach(b => {
            received += b.receivedWeightKg || 0;
            rejected += b.rejectedWeightKg || 0;
            
            const isGradeA = b.gradeLabel?.toLowerCase().includes('grade a') || 
                            b.gradeLabel?.toLowerCase().includes('export');
            if (isGradeA) gACount++;

            const defect = b.primaryDefectType;
            if (defect && defect !== 'None') {
                if (!dMap[defect]) dMap[defect] = { count: 0, rejectedKg: 0 };
                dMap[defect].count++;
                dMap[defect].rejectedKg += b.rejectedWeightKg || 0;
            }
        });

        const sorted = Object.entries(dMap).sort((a, b) => b[1].rejectedKg - a[1].rejectedKg);
        const tDefect = (sorted.length > 0 && sorted[0][1].rejectedKg > 0) ? sorted[0][0] : 'None';
        
        const rejectionRate = received > 0 ? ((rejected / received) * 100).toFixed(1) : '0.0';
        const gARate = batches.length > 0 ? ((gACount / batches.length) * 100).toFixed(1) : '0.0';

        // Farmer rejection rates
        const fMap: Record<string, { name: string; received: number; rejected: number }> = {};
        batches.forEach(b => {
            const farmerId = b.cycleId?.farmer_id?._id || b.cycleId?.farmer_id || 'unknown';
            const farmerName =
                b.cycleId?.farmer_id?.full_name ||
                b.cycleId?.farmer_id?.cooperative_name ||
                b.cycleId?.farm_name ||
                'Unknown Farmer';
            if (!fMap[farmerId]) fMap[farmerId] = { name: farmerName, received: 0, rejected: 0 };
            fMap[farmerId].received += b.receivedWeightKg || 0;
            fMap[farmerId].rejected += b.rejectedWeightKg || 0;
        });

        const fRows = Object.entries(fMap)
            .map(([id, f]) => ({
                id,
                name: f.name,
                received: f.received,
                rejected: f.rejected,
                rate: f.received > 0 ? (f.rejected / f.received) * 100 : 0,
            }))
            .sort((a, b) => b.rate - a.rate);

        return {
            totalReceivedKg: received,
            totalRejectedKg: rejected,
            overallRejectionRate: rejectionRate,
            gradeACount: gACount,
            gradeARate: gARate,
            defectMap: dMap,
            topDefect: tDefect,
            farmerRows: fRows
        };
    }, [batches]);

    const {
        totalRejectedKg,
        overallRejectionRate,
        gradeACount,
        gradeARate,
        defectMap,
        topDefect,
        farmerRows
    } = stats;

    const uniqueDefects = MASTER_DEFECT_TYPES;
    
    const uniqueCrops = useMemo(() => Array.from(new Set(batches.map(b => b.cropName).filter(Boolean))), [batches]);
    const uniqueFarmers = useMemo(() => Array.from(new Set(batches.map(b => {
        return b.cycleId?.farmer_id?.full_name || b.cycleId?.farmer_id?.cooperative_name || b.cycleId?.farm_name || '—';
    }).filter(f => f !== '—'))), [batches]);

    const getFarmerStatus = (rate: number) => {
        if (rate > 30) return { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
        if (rate > 15) return { label: 'Watch', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
        return { label: 'Good', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    };

    // ── Batch QC Log filtering ─────────────────────────────────────
    const filteredBatches = batches.filter(b => {
        const matchesSearch =
            b.cropName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.stockId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.cycleId?.farmer_id?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.cycleId?.farm_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = gradeFilter === 'all' ||
            b.gradeLabel?.toLowerCase().includes(gradeFilter.toLowerCase());
        const matchesDefect = defectFilter === 'all' || b.primaryDefectType === defectFilter;
        
        const farmerName = b.cycleId?.farmer_id?.full_name || b.cycleId?.farmer_id?.cooperative_name || b.cycleId?.farm_name || '—';
        const matchesCrop = cropFilter === 'all' || b.cropName === cropFilter;
        const matchesFarmer = farmerFilter === 'all' || farmerName === farmerFilter;

        return matchesSearch && matchesGrade && matchesDefect && matchesCrop && matchesFarmer;
    });

    // ── Export Logic ───────────────────────────────────────────────
    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toISOString().split('T')[0];

        if (activeTab === 'log') {
            const headers = ['Date', 'Crop', 'Stock ID', 'Farmer / Source', 'Received (kg)', 'Processed (kg)', 'Rejected (kg)', 'Rejection Rate (%)', 'Defect Type', 'Grade', 'Status'];
            const rows = filteredBatches.map(b => [
                formatDateTime(b.updatedAt || b.createdAt),
                b.cropName || '—',
                b.stockId || '—',
                b.cycleId?.farmer_id?.full_name || b.cycleId?.farmer_id?.cooperative_name || b.cycleId?.farm_name || '—',
                b.receivedWeightKg || 0,
                b.processedWeightKg || 0,
                b.rejectedWeightKg || 0,
                b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0.0',
                b.primaryDefectType || 'None',
                b.gradeLabel || '—',
                b.status
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            ws['!cols'] = headers.map((h, i) => ({ wch: Math.min(Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 4, 40) }));
            XLSX.utils.book_append_sheet(wb, ws, 'QC_Log');
        } else {
            // Dashboard Export (Stats + Farmer Rates)
            const statsHeaders = ['Metric', 'Value'];
            const statsRows = [
                ['Batches QC\'d', batches.length],
                ['Overall Rejection Rate', `${overallRejectionRate}%`],
                ['Total Rejected Weight (kg)', totalRejectedKg],
                ['Grade A Rate', `${gradeARate}%`],
                ['Top Defect Type', topDefect]
            ];
            const statsWs = XLSX.utils.aoa_to_sheet([statsHeaders, ...statsRows]);
            XLSX.utils.book_append_sheet(wb, statsWs, 'QC_Overview');

            const farmerHeaders = ['Farmer', 'Received (kg)', 'Rejected (kg)', 'Rejection Rate (%)', 'Status'];
            const farmerRowsData = farmerRows.map(f => [
                f.name,
                f.received,
                f.rejected,
                f.rate.toFixed(1),
                getFarmerStatus(f.rate).label
            ]);
            const farmerWs = XLSX.utils.aoa_to_sheet([farmerHeaders, ...farmerRowsData]);
            XLSX.utils.book_append_sheet(wb, farmerWs, 'Farmer_Performance');
        }

        XLSX.writeFile(wb, `Sarura_QC_${activeTab}_${dateStr}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF(activeTab === 'log' ? 'l' : 'p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

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
        const title = activeTab === 'dashboard' ? 'QUALITY DASHBOARD' : 'QC LOG AUDIT';
        doc.text(`${title} REPORT`, 15, 42);

        // ── 3. Summary Stats Section ──
        const summaryFields = [
            { label: 'Total Batches QC\'d', value: String(batches.length) },
            { label: 'Overall Rejection Rate', value: `${overallRejectionRate}%` },
            { label: 'Total Rejected Weight', value: `${totalRejectedKg.toLocaleString()} kg` },
            { label: 'Top Defect Contributor', value: topDefect },
        ];

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

        // ── 4. Main Content ──
        const headStyles: any = { textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const bodyStyles: any = { fontSize: 7.5, textColor: [0, 0, 0], cellPadding: 3 };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        if (activeTab === 'dashboard') {
            const chartEl = document.getElementById('qc-defect-chart');
            if (chartEl) {
                try {
                    const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
                    const chartImg = canvas.toDataURL('image/png');
                    doc.setFontSize(10); doc.text('DEFECT BREAKDOWN ANALYSIS', 15, yPos + 10);
                    doc.addImage(chartImg, 'PNG', 15, yPos + 15, 120, 80);
                    yPos += 100;
                } catch (e) { console.warn('Chart capture failed', e); }
            }

            doc.setFontSize(10); doc.text('FARMER REJECTION RATES', 15, yPos + 10);
            autoTable(doc, {
                startY: yPos + 15,
                head: [['FARMER', 'RECEIVED', 'REJECTED', 'RATE (%)', 'STATUS']],
                body: farmerRows.map(f => [
                    f.name,
                    `${f.received.toLocaleString()} kg`,
                    `${f.rejected.toLocaleString()} kg`,
                    `${f.rate.toFixed(1)}%`,
                    getFarmerStatus(f.rate).label
                ]),
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });
        } else {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['DATE', 'CROP', 'STOCK ID', 'FARMER / SOURCE', 'RECEIVED', 'PROCESSED', 'REJECTED', 'RATE (%)', 'DEFECT', 'GRADE', 'STATUS']],
                body: filteredBatches.map(b => [
                    formatDateTime(b.updatedAt || b.createdAt),
                    b.cropName || '—',
                    b.stockId || '—',
                    b.cycleId?.farmer_id?.full_name || b.cycleId?.farmer_id?.cooperative_name || b.cycleId?.farm_name || '—',
                    `${(b.receivedWeightKg || 0).toLocaleString()} kg`,
                    `${(b.processedWeightKg || 0).toLocaleString()} kg`,
                    `${(b.rejectedWeightKg || 0).toLocaleString()} kg`,
                    b.receivedWeightKg > 0 ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1) : '0.0',
                    b.primaryDefectType || 'None',
                    b.gradeLabel || '—',
                    b.status
                ]),
                theme: 'striped', headStyles, bodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });
        }

        // ── 5. Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > (activeTab === 'log' ? 160 : 230)) { doc.addPage(); lastY = 20; }

        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);

        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        doc.text(`• Quality Performance: The overall rejection rate is ${overallRejectionRate}%, with ${gradeARate}% Grade A batches.`, 15, lastY + 23);
        doc.text(`• Risk Summary: "${topDefect}" remains the primary quality challenge in the current batch pool.`, 15, lastY + 29);
        doc.text(`• Farmer Impact: High rejections from specific sources are flagged in the performance table above.`, 15, lastY + 35);

        // ── 6. Footer ──
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setDrawColor(229, 231, 235); doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
            doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
            doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const footerY = 288;
            doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, footerY, { align: 'right' });
        }

        doc.save(`Sarura_QC_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    const summaryStats = [
        {
            label: 'Total Produce Processed',
            value: `${(batches.reduce((sum, b) => sum + (b.processedWeightKg || 0), 0) / 1000).toFixed(1)} Tons`,
            sub: `from ${batches.length} processing batches`,
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
            alert: false,
        },
        {
            label: 'Overall Rejection Rate',
            value: `${overallRejectionRate}%`,
            sub: `${totalRejectedKg.toLocaleString()} kg rejected`,
            icon: TrendingDown,
            color: parseFloat(overallRejectionRate) > 20 ? 'text-red-600' : 'text-amber-600',
            bg: parseFloat(overallRejectionRate) > 20 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
            alert: parseFloat(overallRejectionRate) > 20,
        },
        {
            label: 'Grade A Rate',
            value: `${gradeARate}%`,
            sub: `${gradeACount} of ${batches.length} batches`,
            icon: AlertOctagon,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            alert: false,
        },
        {
            label: 'Top Defect Type',
            value: topDefect,
            sub: topDefect !== 'None' ? `${defectMap[topDefect]?.rejectedKg?.toLocaleString()} kg affected` : 'No defects logged',
            icon: Activity,
            color: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            alert: false,
        },
    ];

    return (
        <div className="p-6 space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QC Insights</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Grade distribution, defect analysis and farmer rejection rates
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                            >
                                <Download size={15} />
                                Export Data
                                
                            </button>

                            
                        </div>

                        <button
                            onClick={fetchBatches}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-6">
                {summaryStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <div className="text-2xl font-bold mt-1 text-black dark:text-white">
                                    {stat.value}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={stat.color} size={22} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'dashboard', label: 'Quality Dashboard' },
                        { id: 'log', label: 'Batch QC Log' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'border-green-600 text-green-700 dark:text-green-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">

                {/* TAB 1: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-2 gap-6">

                        {/* Defect Breakdown — Donut */}
                        <div id="qc-defect-chart" className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Defect Breakdown by Rejected Weight</h3>
                            <p className="text-xs text-gray-400 mb-4">Across all Processed Produce — by kg</p>

                            {loading ? (
                                <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                                    Loading...
                                </div>
                            ) : Object.keys(defectMap).length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-16">No defect data recorded yet.</p>
                            ) : (() => {
                                const COLORS = ['#f97316', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];

                                const donutData = Object.entries(defectMap)
                                    .sort((a, b) => b[1].rejectedKg - a[1].rejectedKg)
                                    .map(([defect, data], idx) => ({
                                        name: defect,
                                        value: data.rejectedKg,
                                        batches: data.count,
                                        color: COLORS[idx % COLORS.length],
                                    }));

                                const totalRejectedInMap = donutData.reduce((sum, d) => sum + d.value, 0);

                                const CustomTooltip = ({ active, payload }: any) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    const pct = totalRejectedInMap > 0
                                        ? ((d.value / totalRejectedInMap) * 100).toFixed(1)
                                        : '0';
                                    return (
                                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{d.name}</p>
                                            <p className="text-gray-500">Rejected: <span className="font-semibold text-red-500">{d.value.toLocaleString()} kg</span></p>
                                            <p className="text-gray-500">Share: <span className="font-semibold text-gray-800 dark:text-gray-200">{pct}%</span></p>
                                            <p className="text-gray-500">Batches: <span className="font-semibold text-gray-800 dark:text-gray-200">{d.batches}</span></p>
                                        </div>
                                    );
                                };



                                return (
                                    <div className="flex flex-col gap-4">
                                        {/* Donut */}
                                        {/* Donut with center label */}
                                        <div className="relative" style={{ height: 220 }}>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <PieChart>
                                                    <Pie
                                                        data={donutData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={90}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        labelLine={false}
                                                    >
                                                        {donutData.map((entry, idx) => (
                                                            <Cell key={idx} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>

                                            {/* Center label — absolutely positioned over the donut hole */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-2xl font-bold text-black dark:text-white leading-tight">
                                                    {totalRejectedInMap > 0
                                                        ? `${((donutData[0]?.value / totalRejectedInMap) * 100).toFixed(0)}%`
                                                        : '—'
                                                    }
                                                </span>
                                                <span className="text-[10px] text-gray-500 mt-0.5 text-center px-4 leading-tight">
                                                    {donutData[0]?.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Center total weight below chart */}
                                        <div className="text-center -mt-3">
                                            <p className="text-xs text-gray-400">Total rejected across all defects</p>
                                            <p className="text-lg font-bold text-black dark:text-white">{totalRejectedInMap.toLocaleString()} kg</p>
                                        </div>

                                        {/* Legend rows — defect + crop breakdown */}
                                        <div className="space-y-2 mt-1">
                                            {donutData.map((d, idx) => {
                                                const pct = totalRejectedInMap > 0
                                                    ? ((d.value / totalRejectedInMap) * 100).toFixed(1)
                                                    : '0';

                                                // Find which crops contribute to this defect
                                                const cropsForDefect = batches
                                                    .filter(b => b.primaryDefectType === d.name && b.rejectedWeightKg > 0)
                                                    .reduce((acc: Record<string, number>, b) => {
                                                        const crop = b.cropName || 'Unknown';
                                                        acc[crop] = (acc[crop] || 0) + (b.rejectedWeightKg || 0);
                                                        return acc;
                                                    }, {});

                                                const cropSummary = Object.entries(cropsForDefect)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .map(([crop, kg]) => `${crop} (${kg.toLocaleString()} kg)`)
                                                    .join(', ');

                                                return (
                                                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                                                        <span
                                                            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                                                            style={{ backgroundColor: d.color }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{d.name}</span>
                                                                <span className="text-xs font-bold text-black dark:text-white flex-shrink-0">
                                                                    {d.value.toLocaleString()} kg · {pct}%
                                                                </span>
                                                            </div>
                                                            {cropSummary && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{cropSummary}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Farmer Rejection Rates */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Farmer Rejection Rates</h3>
                            <p className="text-xs text-gray-400 mb-6">Rejected kg / Received kg — Worst first</p>

                            {loading ? (
                                <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                                    Loading...
                                </div>
                            ) : farmerRows.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-10">No farmer data available yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                                <th className="pb-3">Farmer</th>
                                                <th className="pb-3 text-right">Received</th>
                                                <th className="pb-3 text-right">Rejected</th>
                                                <th className="pb-3 text-right">Rate</th>
                                                <th className="pb-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {farmerRows.map(f => {
                                                const status = getFarmerStatus(f.rate);
                                                return (
                                                    <tr key={f.id}>
                                                        <td className="py-3 text-sm font-medium text-black dark:text-white">{f.name}</td>
                                                        <td className="py-3 text-right text-xs text-black dark:text-white font-medium">{f.received.toLocaleString()} kg</td>
                                                        <td className="py-3 text-right text-xs text-black dark:text-white font-medium">{f.rejected.toLocaleString()} kg</td>
                                                        <td className="py-3 text-right text-sm font-bold text-black dark:text-white">{f.rate.toFixed(1)}%</td>
                                                        <td className="py-3 text-right">
                                                            <span className={`text-xs font-bold ${status.label === 'Critical' ? 'text-red-600 dark:text-red-400' :
                                                                status.label === 'Watch' ? 'text-amber-600 dark:text-amber-400' :
                                                                    'text-green-600 dark:text-green-400'
                                                                }`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: BATCH QC LOG */}
                {activeTab === 'log' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

                        {/* Filters */}
                        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex-wrap">
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search crop, farmer, stock ID..."
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
                                />
                            </div>

                            <div className="relative">
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={gradeFilter}
                                    onChange={e => { setGradeFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Grades</option>
                                    <option value="grade a">Grade A (Export)</option>
                                    <option value="grade b">Grade B</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={defectFilter}
                                    onChange={e => { setDefectFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Defects</option>
                                    {uniqueDefects.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={cropFilter}
                                    onChange={e => { setCropFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Crops</option>
                                    {uniqueCrops.map(c => (
                                        <option key={c as string} value={c as string}>{c as string}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={farmerFilter}
                                    onChange={e => { setFarmerFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Farmers</option>
                                    {uniqueFarmers.map(f => (
                                        <option key={f as string} value={f as string}>{f as string}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            {(searchQuery || gradeFilter !== 'all' || defectFilter !== 'all' || cropFilter !== 'all' || farmerFilter !== 'all') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setGradeFilter('all'); setDefectFilter('all'); setCropFilter('all'); setFarmerFilter('all'); setCurrentPage(1); }}
                                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Crop</th>
                                        <th className="px-6 py-4">Farmer / Source</th>
                                        <th className="px-6 py-4">Received</th>
                                        <th className="px-6 py-4">Processed</th>
                                        <th className="px-6 py-4">Rejected</th>
                                        <th className="px-6 py-4">Defect Type</th>
                                        <th className="px-6 py-4">Grade</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                                                    Loading batches...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredBatches.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400 italic">
                                                No batches match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBatches
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map(b => {
                                                const farmerName =
                                                    b.cycleId?.farmer_id?.full_name ||
                                                    b.cycleId?.farmer_id?.cooperative_name ||
                                                    b.cycleId?.farm_name ||
                                                    '—';
                                                const rejRate = b.receivedWeightKg > 0
                                                    ? ((b.rejectedWeightKg / b.receivedWeightKg) * 100).toFixed(1)
                                                    : '0.0';
                                                const isHighRejection = parseFloat(rejRate) > 20;

                                                return (
                                                    <tr key={b._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isHighRejection ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                            {formatDateTime(b.updatedAt || b.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{b.cropName || '—'}</span>
                                                            {b.stockId && (
                                                                <span className="block text-xs font-mono text-gray-400 mt-0.5">{b.stockId}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                            {farmerName}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                            {(b.receivedWeightKg || 0).toLocaleString()} kg
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                            {(b.processedWeightKg || 0).toLocaleString()} kg
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className={`text-sm font-medium ${b.rejectedWeightKg > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                                                    {(b.rejectedWeightKg || 0).toLocaleString()} kg
                                                                </span>
                                                                {b.rejectedWeightKg > 0 && (
                                                                    <span className={`text-[10px] font-semibold ${isHighRejection ? 'text-red-500' : 'text-gray-400'}`}>
                                                                        {rejRate}% rejection rate
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {b.primaryDefectType && b.primaryDefectType !== 'None' ? (
                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                    {b.primaryDefectType}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                                {b.gradeLabel || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-sm font-medium ${b.status === 'Done' ? 'text-green-600 dark:text-green-400' :
                                                                b.status === 'QCDone' ? 'text-amber-600 dark:text-amber-400' :
                                                                    'text-red-600 dark:text-red-400'
                                                                }`}>
                                                                {b.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredBatches.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default QCInsights;
