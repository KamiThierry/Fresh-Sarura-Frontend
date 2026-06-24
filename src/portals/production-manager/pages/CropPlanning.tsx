import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { X, Sprout, Plus, AlertTriangle, ChevronRight, AlertCircle, Download, Wallet, CheckCircle2, Calculator, RefreshCw } from 'lucide-react';
import CreateCropCycleModal from '../components/CreateCropCycleModal';
import CropCycleDetailModal from '../components/CropCycleDetailModal';
import BudgetRejectionModal from '../components/BudgetRejectionModal';
import { useToastContext } from '@/context/ToastContext';
import { usePMContext } from '@/context/PMContext';
import { formatDate } from '@/lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

const CropPlanning = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<any>(null);
    const { showToast } = useToastContext();
    const [initialTab, setInitialTab] = useState<'overview' | 'financials' | 'requests' | 'forecasts'>('overview');
    const [rejectionModalConfig, setRejectionModalConfig] = useState<{ isOpen: boolean; requestId: string | null }>({
        isOpen: false,
        requestId: null,
    });
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [overdraftWarning, setOverdraftWarning] = useState<any>(null); // { requestId, details }
    const [initialAdjust, setInitialAdjust] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [filterFarm, setFilterFarm]     = useState('');
    const [filterSeason, setFilterSeason] = useState('');
    const [filterCrop, setFilterCrop]     = useState('');
    const [filterStatus, setFilterStatus] = useState('');



    const { 
        cycles, 
        pendingRequests, 
        pendingForecasts,
        pendingReports,
        loading, 
        refreshCycles, 
        refreshPendingRequests,
        refreshPendingForecasts,
        refreshPendingReports,
        refreshAll
    } = usePMContext();

    // Unique values for dropdowns — derived from the cycles array
    const uniqueFarms = [...new Set(cycles.map((c: any) => c.farm_name).filter(Boolean))];
    const uniqueCrops = [...new Set(cycles.map((c: any) => c.crop_name || c.crop).filter(Boolean))];

    // Filtered cycles logic
    const filteredCycles = cycles.filter((c: any) => {
        if (filterFarm   && (c.farm_name) !== filterFarm) return false;
        if (filterSeason && c.season !== filterSeason)     return false;
        if (filterCrop   && (c.crop_name || c.crop) !== filterCrop) return false;
        if (filterStatus && c.status !== filterStatus)     return false;
        return true;
    });

    // Split filtered cycles into active/in_progress and completed
    const activeCyclesFiltered = filteredCycles.filter((c: any) => c.status !== 'completed');
    const completedCyclesFiltered = filteredCycles.filter((c: any) => c.status === 'completed');

    const handleApproveRequest = async (requestId: string, forceApprove = false) => {
        try {
            await api.patch(`/crop-cycles/budget-requests/${requestId}/approve`, { forceApprove, pmNote: 'Approved' });
            showToast('Request Approved', 'The budget allocation has been updated.');
            setOverdraftWarning(null);
            refreshPendingRequests();
            refreshCycles();
        } catch (err: any) {
            if (err.code === 'BUDGET_OVERDRAFT') {
                setOverdraftWarning({ requestId, details: err.overdraftDetails });
            } else {
                console.error('Failed to approve request:', err);
                showToast('Error', err.message || 'Failed to approve request.');
            }
        }
    };

    const handleConfirmRejection = async (requestId: string, pmNote: string) => {
        try {
            await api.patch(`/crop-cycles/budget-requests/${requestId}/reject`, { pmNote });
            showToast('Request Rejected');
            refreshPendingRequests();
        } catch (err) {
            console.error('Failed to reject request:', err);
            showToast('Error', 'Failed to reject request.');
        }
    };

    const handleRejectRequest = (requestId: string) => {
        setRejectionModalConfig({ isOpen: true, requestId });
    };

    const calculateProgress = (spent: number, total: number) => {
        const percentage = (spent / total) * 100;
        return Math.min(percentage, 100);
    };

    const handleDeleteCycle = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/crop-cycles/${deleteTarget.id}`);
            setDeleteTarget(null);
            showToast('Cycle Deleted', `${deleteTarget.name} has been removed.`);
            refreshCycles();
        } catch (err: any) {
            console.error('Failed to delete cycle:', err);
            showToast('Error', err.response?.data?.message || 'Failed to delete cycle.');
        }
    };

    const handleCloseCycle = async (cycleId: string, finalYield: string) => {
        try {
            await api.patch(`/crop-cycles/${cycleId}/close`, { finalYield });
            refreshCycles();
            setSelectedCycle(null);
            showToast('Crop Cycle Closed', `Final yield recorded: ${finalYield}`);
        } catch (err) {
            console.error('Failed to close cycle:', err);
            showToast('Error', 'Failed to close the cycle. Please try again.');
        }
    };

    const handleOpenDetail = (cycle: any) => {
        setSelectedCycle({
            ...cycle,
            id: cycle._id,
            cycleId: cycle.cycleId ?? cycle._id,
            crop: cycle.crop_name,
            landSize: `${cycle.block_size_hectares ?? '—'} Ha`,
            startDate: formatDate(cycle.planting_date || cycle.start_date),
            endDate: formatDate(cycle.expected_harvest_date),
            budget: cycle.total_budget,
            spent: cycle.spent ?? 0,
            yieldGoal: cycle.yield_goal_kg != null ? `${cycle.yield_goal_kg.toLocaleString()} kg` : '—',
        });
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
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
        doc.text('CROP PLANNING & BUDGET OVERSIGHT REPORT', 15, 42);

        // ── 3. Summary Section ──
        const activeCycles = activeCyclesFiltered.length;

        const summaryFields = [
            { label: 'Total Crop Cycles', value: String(totalCyclesNum) },
            { label: 'Active Cycles', value: String(activeCycles) },
            { label: 'Total Budget', value: totalBudgetNum.toLocaleString() + ' Rwf' },
            { label: 'Total Approved', value: totalApprovedNum.toLocaleString() + ' Rwf' },
            { label: 'Total Actual Cost', value: totalSpentNum.toLocaleString() + ' Rwf' },
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

        // ── 4. Data Tables ──
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
        doc.text('CROP CYCLES', 15, yPos + 10);

        autoTable(doc, {
            startY: yPos + 15,
            head: [['FARM/SEASON', 'CROP', 'PLANTING', 'HARVEST', 'BUDGET', 'APPROVED', 'SPENT', 'STATUS']],
            body: filteredCycles.map((c: any) => [
                `${c.farm_name || c.block_name || 'N/A'}\n${c.season || 'N/A'}`,
                c.crop_name || c.crop || 'N/A',
                (c.planting_date || c.start_date) ? formatDate(c.planting_date || c.start_date) : 'N/A',
                c.expected_harvest_date ? formatDate(c.expected_harvest_date) : 'N/A',
                (c.total_budget || 0).toLocaleString(),
                (c.approved || 0).toLocaleString(),
                (c.spent || 0).toLocaleString(),
                c.status ? c.status.toUpperCase() : 'N/A'
            ]),
            theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
            margin: { left: 15, right: 15 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const s = String(data.cell.raw).toLowerCase();
                    if (s === 'active') data.cell.styles.textColor = '#16a34a';
                    else if (s === 'in_progress' || s === 'harvesting') data.cell.styles.textColor = '#d97706';
                    else if (s === 'completed') data.cell.styles.textColor = '#6b7280';
                }
            }
        });

        // ── 5. System Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report provides an overview of active and completed crop cycles and budget utilization.', 15, lastY + 25);
        
        // ── 6. Footer ──
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

        doc.save(`FreshSarura_CropPlanning_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const totalCyclesNum = filteredCycles.length;
    const totalBudgetNum = filteredCycles.reduce((sum: number, c: any) => sum + (c.total_budget || 0), 0);
    const totalApprovedNum = filteredCycles.reduce((sum: number, c: any) => sum + (c.approved || 0), 0);
    const totalSpentNum = filteredCycles.reduce((sum: number, c: any) => sum + (c.spent || 0), 0);

    const kpiStats = [
        {
            label: 'Total Cycles',
            value: totalCyclesNum,
            icon: Sprout,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-100 dark:bg-green-900/30'
        },
        {
            label: 'Total Budget (Rwf)',
            value: totalBudgetNum.toLocaleString(),
            icon: Wallet,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30'
        },
        {
            label: 'Total Approved (Rwf)',
            value: totalApprovedNum.toLocaleString(),
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30'
        },
        {
            label: 'Total Actual Cost (Rwf)',
            value: totalSpentNum.toLocaleString(),
            icon: Calculator,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
        }
    ];

    return (
        <div className="p-6 space-y-8 pb-20">

            {/* Page Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crop Planning & Budget Oversight</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Allocate farm budgets and monitor spending variances.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap ml-auto justify-end">
                        <button
                            onClick={refreshAll}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <RefreshCw size={15} /> Refresh
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <Download size={17} />
                            Export Data
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <Plus size={18} />
                            Start New Crop Cycle
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {kpiStats.map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
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

            {/* Derived data for flags */}
            {(() => {
                const unreadRequests = pendingRequests.filter((r: any) => !r.isReadByPM);
                const unreadForecasts = pendingForecasts.filter((f: any) => !f.isReadByPM);
                const unreadReports = pendingReports.filter((r: any) => !r.isReadByPM);
                const hasActions = unreadRequests.length > 0 || unreadForecasts.length > 0 || unreadReports.length > 0;

                if (!hasActions) return null;

                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Action Required: Pending Reviews</h3>
                        </div>

                        {/* Budget Alerts */}
                        <div className="space-y-4">
                            {unreadRequests.map((request) => {
                                const primaryCategory = request.lineItems?.[0]?.category || 'General';
                                const cycleCat = request.cycle_budget_categories?.find((c: any) => c.name === primaryCategory) || { allocated: 0, spent: 0 };
                                const amount = request.totalRequestedRwf;
                                const limit = Math.max(0, cycleCat.allocated - cycleCat.spent);
                                const isOverdraft = amount > limit;

                                return (
                                    <div 
                                        key={request._id} 
                                        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border-l-4 ${isOverdraft ? 'border-red-500' : 'border-amber-400'} shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group/card`}
                                        onClick={async (e) => {
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            try { await api.patch(`/crop-cycles/budget-requests/${request._id}/read`, {}); } catch (err) { console.error(err); }
                                            refreshPendingRequests();
                                            setSelectedItemId(request._id);
                                            setInitialTab('requests');
                                            const cycle = cycles.find(c => c._id === request.cycleId);
                                            if (cycle) handleOpenDetail(cycle);
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                                            <AlertTriangle size={80} />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                            {request.farm_name}
                                                        </span>
                                                        <span className="text-xs text-gray-400">• Budget Request</span>
                                                    </div>
                                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                                        {isOverdraft ? '⚠️ Budget Overdraft Request' : '⏳ Pending Budget Request'} from {request.submittedByName}
                                                    </h2>
                                                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                                                        Requesting <strong>{amount.toLocaleString()} Rwf</strong> for {primaryCategory}.
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleRejectRequest(request._id)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">Reject</button>
                                                    <button onClick={() => handleApproveRequest(request._id)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">Approve</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Yield Forecast Alerts */}
                            {unreadForecasts.map((forecast) => {
                                const cycle = cycles.find(c => c._id === forecast.cycleId);
                                return (
                                    <div 
                                        key={forecast._id} 
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-l-4 border-blue-500 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group/card"
                                        onClick={async () => {
                                            try { await api.patch(`/crop-cycles/yield-forecasts/${forecast._id}/read`, {}); } catch (err) { console.error(err); }
                                            refreshPendingForecasts();
                                            setSelectedItemId(forecast._id);
                                            setInitialTab('forecasts');
                                            if (cycle) handleOpenDetail(cycle);
                                        }}
                                    >
                                        <div className="relative z-10 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                        {cycle?.farm_name || 'Farm'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">• Yield Forecast</span>
                                                </div>
                                                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                                    New Yield Prediction: {forecast.predictionKg?.toLocaleString()} kg
                                                </h2>
                                                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                                                    Expected Harvest: {formatDate(forecast.harvestDate)} • {forecast.confidence} Confidence
                                                </p>
                                            </div>
                                            <button className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Field Report Alerts */}
                            {unreadReports.map((report) => {
                                const cycle = cycles.find(c => c._id === report.cycleId);
                                return (
                                    <div 
                                        key={report._id} 
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-l-4 border-emerald-500 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group/card"
                                        onClick={async () => {
                                            try { await api.patch(`/crop-cycles/field-reports/${report._id}/read`, {}); } catch (err) { console.error(err); }
                                            refreshPendingReports();
                                            setSelectedItemId(report._id);
                                            setInitialTab('overview');
                                            if (cycle) handleOpenDetail(cycle);
                                        }}
                                    >
                                        <div className="relative z-10 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                        {cycle?.farm_name || 'Farm'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">• Field Report</span>
                                                </div>
                                                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                                    New Report: {report.description}
                                                </h2>
                                                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                                                    Actual Cost: {report.actualCostRwf?.toLocaleString()} Rwf • {report.category}
                                                </p>
                                            </div>
                                            <button className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                    </div>
                );
            })()}

            {/* Section 2: Active Crop Cycles */}
            <div className="mb-12">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Crop Cycles</h3>
                        <p className="text-sm text-gray-500 mt-1">Overview of ongoing production</p>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        
                        {/* Farm filter */}
                        <select
                            value={filterFarm}
                            onChange={e => setFilterFarm(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Farms</option>
                            {uniqueFarms.map(farm => (
                                <option key={farm} value={farm}>{farm}</option>
                            ))}
                        </select>

                        {/* Season filter */}
                        <select
                            value={filterSeason}
                            onChange={e => setFilterSeason(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Seasons</option>
                            <option value="Season A">Season A</option>
                            <option value="Season B">Season B</option>
                            <option value="Season C">Season C</option>
                        </select>

                        {/* Crop filter */}
                        <select
                            value={filterCrop}
                            onChange={e => setFilterCrop(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Crops</option>
                            {uniqueCrops.map(crop => (
                                <option key={crop} value={crop}>{crop}</option>
                            ))}
                        </select>

                        {/* Status filter */}
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        {/* Clear filters */}
                        {(filterFarm || filterSeason || filterCrop || filterStatus) && (
                            <button
                                onClick={() => { setFilterFarm(''); setFilterSeason(''); setFilterCrop(''); setFilterStatus(''); }}
                                className="px-3 py-2 rounded-lg text-xs font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                            >
                                Clear filters
                            </button>
                        )}

                        {/* Result count */}
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-gray-400 font-bold uppercase tracking-wider ml-1">
                            {filteredCycles.length} cycle{filteredCycles.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 font-medium italic">Loading latest production data...</p>
                    </div>
                ) : activeCyclesFiltered.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <Sprout size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">No active cycles found</h4>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                            { (filterFarm || filterSeason || filterCrop || filterStatus) 
                                ? "Try adjusting your filters to see more results."
                                : "Start a new crop cycle to begin tracking production."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeCyclesFiltered.map((cycle) => (
                            <CycleCard 
                                key={cycle._id} 
                                cycle={cycle} 
                                onSelect={() => {
                                    setInitialTab('overview');
                                    handleOpenDetail(cycle);
                                }}
                                onDeleteRequest={(id) => setDeleteTarget({ id, name: cycle.crop_name })}
                                calculateProgress={calculateProgress}
                                pendingCount={pendingRequests.filter((r: any) => r.cycleId === cycle._id).length}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Section 3: Completed Crop Cycles (History) */}
            {!loading && completedCyclesFiltered.length > 0 && (
                <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Completed Crop Cycles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                        {completedCyclesFiltered.map((cycle) => (
                            <CycleCard 
                                key={cycle._id} 
                                cycle={cycle} 
                                onSelect={() => {
                                    setInitialTab('overview');
                                    handleOpenDetail(cycle);
                                }}
                                calculateProgress={calculateProgress}
                                pendingCount={0}
                            />
                        ))}
                    </div>
                </div>
            )}



            {/* Modal 1: Create Cycle */}
            <CreateCropCycleModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (formData) => {
                    try {
                        await api.post('/crop-cycles', formData);
                        setIsCreateModalOpen(false);
                        refreshCycles();
                        showToast('Crop Cycle Created!', `${formData.crop_name} cycle is now active.`);
                    } catch (err: any) {
                        console.error('Failed to create cycle:', err);
                        const msg = err.response?.data?.message || 'Failed to create the crop cycle. Please try again.';
                        showToast('Error', msg);
                    }
                }}
            />

            {/* Modal 2: Cycle Details */}
            {selectedCycle && (
                <CropCycleDetailModal 
                    isOpen={selectedCycle !== null} 
                    onClose={() => {
                        setSelectedCycle(null);
                        setSelectedItemId(null);
                        setInitialAdjust(false);
                    }} 
                    cycle={selectedCycle} 
                    initialTab={initialTab}
                    initialItemId={selectedItemId}
                    initialAdjust={initialAdjust}
                    onCycleUpdated={() => {
                        refreshCycles();
                        refreshPendingRequests();
                        refreshPendingForecasts();
                        refreshPendingReports();
                    }}
                    onCloseCycle={(finalYield) => handleCloseCycle(selectedCycle._id, finalYield)}
                />
            )}

            {/* Modal 3: Rejection Feedback */}
            <BudgetRejectionModal
                isOpen={rejectionModalConfig.isOpen}
                onClose={() => setRejectionModalConfig({ isOpen: false, requestId: null })}
                requestId={rejectionModalConfig.requestId}
                onConfirm={handleConfirmRejection}
            />

            <OverdraftWarningModal
                isOpen={!!overdraftWarning}
                onClose={() => setOverdraftWarning(null)}
                details={overdraftWarning?.details || []}
                onConfirm={() => handleApproveRequest(overdraftWarning.requestId, true)}
                onAdjust={() => {
                    const req = pendingRequests.find((r: any) => r._id === overdraftWarning.requestId);
                    const cycleToOpen = cycles.find((c: any) => c._id === req?.cycleId);
                    if (cycleToOpen) {
                        setOverdraftWarning(null);
                        setInitialAdjust(true);
                        setInitialTab('requests'); // Switch to requests tab immediately
                        setSelectedItemId(overdraftWarning.requestId); // Focus on the request
                        handleOpenDetail(cycleToOpen);
                    } else {
                        setOverdraftWarning(null);
                    }
                }}
            />

            {/* Modal 5: Delete Confirmation */}
            <DeleteConfirmationModal 
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteCycle}
                cycleName={deleteTarget?.name || ''}
            />


        </div>
    );
};

// ── Local Component: CycleCard ──────────────────────────────────────────
const CycleCard = ({ cycle, onSelect, calculateProgress, onDeleteRequest, pendingCount = 0 }: { cycle: any, onSelect: () => void, calculateProgress: any, onDeleteRequest?: (id: string) => void, pendingCount?: number }) => {
    const total = cycle.total_budget ?? 0;
    const approved = cycle.approved ?? 0;
    const progress = calculateProgress(approved, total);
    const isCompleted = cycle.status === 'completed';
    
    const statusLabel = cycle.status === 'active' ? '● Active'
        : (cycle.status === 'in_progress' || cycle.status === 'harvesting') ? '◉ In Progress'
        : cycle.status === 'completed' ? '✓ Completed'
        : cycle.status;

    return (
        <div className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            {/* Delete button (only for non-completed cycles) */}
            {!isCompleted && onDeleteRequest && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(cycle._id);
                    }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center z-10"
                    title="Delete cycle"
                >
                    <X size={14} />
                </button>
            )}
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{cycle.farm_name ?? cycle.block_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            {cycle.season}
                        </span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sprout size={20} className="text-green-500" />
                        {cycle.crop_name}
                    </h4>
                </div>
                <div className="flex items-center gap-2 pr-8">
                    {/* Empty space for the absolute X button */}
                </div>
            </div>

            {/* Status badge */}
            <div className="mb-3 flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    (cycle.status === 'in_progress' || cycle.status === 'harvesting') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse' :
                    cycle.status === 'completed' ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                    {statusLabel}
                </span>
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse shadow-sm border border-amber-200 dark:border-amber-800/50">
                        <AlertCircle size={10} /> {pendingCount} Pending Request
                    </span>
                )}
            </div>

            {/* Cycle Progress */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-gray-500">Cycle Progress</span>
                    <span className={`text-sm font-bold ${progress >= 90 ? 'text-amber-600' : 'text-green-600'}`}>
                        {Math.round(progress)}% Approved
                    </span>
                </div>
                <div className="relative h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                            (cycle.status === 'in_progress' || cycle.status === 'harvesting') ? 'bg-amber-500' :
                            cycle.status === 'completed' ? 'bg-gray-400' :
                            progress >= 90 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-mono text-gray-400">
                    <span>{approved.toLocaleString()} Rwf approved</span>
                    <span>{total.toLocaleString()} Rwf budget</span>
                </div>
            </div>

            {/* Footer Action */}
            <button
                onClick={onSelect}
                className="w-full py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 transition-colors"
            >
                Manage Cycle <ChevronRight size={16} />
            </button>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, cycleName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, cycleName: string }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <h3 className="text-base font-bold text-red-800 dark:text-red-300">Delete Crop Cycle</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Are you sure you want to delete the <strong className="text-gray-900 dark:text-white">{cycleName}</strong> cycle? This cannot be undone and will remove all associated budget records.
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
                            Delete Cycle
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CropPlanning;

const OverdraftWarningModal = ({
    isOpen, onClose, details, onConfirm, onAdjust
}: {
    isOpen: boolean;
    onClose: () => void;
    details: any[];
    onConfirm: () => void;
    onAdjust: () => void;
}) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900/30 animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-6 py-5 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">Budget Overdraft!</h3>
                        <p className="text-xs text-red-600 dark:text-red-500 font-medium">This request exceeds the category limits.</p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {details.map((d, i) => (
                            <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{d.category}</span>
                                    <span className="text-xs font-mono font-bold text-red-600">+{d.excess.toLocaleString()} Rwf</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                                    <span>Remaining: {d.remaining.toLocaleString()} Rwf</span>
                                    <span>Requested: {d.requested.toLocaleString()} Rwf</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                        You can either adjust the allocated budget for these categories first, or force-approve this request anyway.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg"
                        >
                            Approve Anyway
                        </button>
                        <button
                            onClick={onAdjust}
                            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-lg shadow-red-900/20"
                        >
                            Adjust Budget First
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
