import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ClipboardList, FileText, CheckCircle2,
  AlertCircle, TrendingUp,
  Target, Coins, Activity, Sprout, ThumbsUp, ThumbsDown,
  ListChecks, Lock, Plus, Loader2, Download, ChevronDown, FileSpreadsheet
} from 'lucide-react';
import EvidenceViewModal from './EvidenceViewModal';
import BudgetLedgerModal from './BudgetLedgerModal';
import BudgetRejectionModal from './BudgetRejectionModal';
import { api } from '@/lib/api';
import { usePMContext } from '@/context/PMContext';
import { useToastContext } from '@/context/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '@/assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

// Helper for embedding images in PDFs
const getBase64FromUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Failed to fetch image for PDF:", url, err);
    return null;
  }
};

interface CropCycleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycle: any;
  onCloseCycle?: (finalYield: string) => void;
  onCycleUpdated?: () => void;
  initialTab?: 'overview' | 'financials' | 'requests' | 'forecasts';
  initialItemId?: string | null;
  initialAdjust?: boolean;
}

const CropCycleDetailModal = ({
  isOpen, onClose, cycle, onCloseCycle, onCycleUpdated, initialTab, initialItemId, initialAdjust
}: CropCycleDetailModalProps) => {

  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'requests' | 'forecasts'>(initialTab || 'overview');

  // ─── Real data state ───────────────────────────────────────────────
  const [fullData, setFullData] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [cycleStatus, setCycleStatus] = useState(cycle?.status || 'Active');

  // ─── Sub-modal state ───────────────────────────────────────────────
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAdjustBudgetOpen, setIsAdjustBudgetOpen] = useState(initialAdjust || false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [selectedFieldReport, setSelectedFieldReport] = useState<any>(null);
  const [selectedEvidenceTask, setSelectedEvidenceTask] = useState<any>(null);
  const [rejectionModalConfig, setRejectionModalConfig] = useState<{ isOpen: boolean; requestId: string | null }>({
    isOpen: false,
    requestId: null,
  });
  const [overdraftWarning, setOverdraftWarning] = useState<any>(null); // { requestId, details }

  // ─── Per-forecast reply text ───────────────────────────────────────
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const { showToast } = useToastContext();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const {
    refreshPendingRequests,
    refreshPendingForecasts,
    refreshPendingReports,
    refreshCycles
  } = usePMContext();

  // ─── Fetch all cycle data ──────────────────────────────────────────
  const fetchFull = async () => {
    if (!cycle?._id) return;
    setLoadingFull(true);
    try {
      const res = await api.get(`/crop-cycles/${cycle._id}/full`);
      setFullData(res.data);
      setCycleStatus(res.data.cycle.status);
    } catch (err) {
      console.error('Failed to fetch cycle details:', err);
    } finally {
      setLoadingFull(false);
    }
  };

  useEffect(() => {
    if (isOpen && cycle?._id) {
      fetchFull();
      setActiveTab(initialTab || 'overview');
    }
  }, [isOpen, cycle?._id, initialTab]);

  // Handle deep-linking to specific items
  useEffect(() => {
    if (fullData && initialItemId) {
      // Check field reports
      const report = fullData.fieldReports?.find((r: any) => r._id === initialItemId);
      if (report) {
        setSelectedFieldReport(report);
        return;
      }
      // Check budget requests (just open the tab)
      const req = fullData.budgetRequests?.find((r: any) => r._id === initialItemId);
      if (req) {
        setActiveTab('requests');
        return;
      }
      // Check forecasts
      const forecast = fullData.forecasts?.find((f: any) => f._id === initialItemId);
      if (forecast) {
        setActiveTab('forecasts');
        return;
      }
    }
  }, [fullData, initialItemId]);

  if (!isOpen || !cycle) return null;

  // ─── Derived financials ────────────────────────────────────────────
  let budgetCategories = fullData?.cycle?.budget_categories || [];
  if (budgetCategories.length === 0) {
    const src = fullData?.cycle || cycle;
    if (src.total_budget > 0) {
      budgetCategories = [
        { name: 'Seeds & Seedlings', allocated: src.budget_seeds || 0, spent: 0 },
        { name: 'Fertilizers',       allocated: src.budget_fertilizers || 0, spent: 0 },
        { name: 'Chemicals',         allocated: src.budget_chemicals || 0, spent: 0 },
        { name: 'Labor',             allocated: src.budget_labor || 0, spent: 0 },
      ];
    }
  }
  const budgetRequests = fullData?.budgetRequests || [];
  const forecasts = fullData?.forecasts || [];
  const fieldReports = fullData?.fieldReports || [];

  const totalAllocated = budgetCategories.reduce((a: number, c: any) => a + (c.allocated || 0), 0);
  const totalApproved  = budgetCategories.reduce((a: number, c: any) => a + (c.approved || 0), 0);
  const totalSpent     = budgetCategories.reduce((a: number, c: any) => a + (c.spent || 0), 0);
  const globalVariance = totalAllocated - totalSpent;

  // ─── Actions ──────────────────────────────────────────────────────
  const handleApproveRequest = async (requestId: string, forceApprove = false) => {
    try {
      await api.patch(`/crop-cycles/budget-requests/${requestId}/approve`, { forceApprove });
      setOverdraftWarning(null);
      fetchFull();
      refreshPendingRequests();
      refreshCycles();
      if (onCycleUpdated) onCycleUpdated();
    } catch (err: any) {
      if (err.code === 'BUDGET_OVERDRAFT') {
        setOverdraftWarning({ requestId, details: err.overdraftDetails });
      } else if (err.code === 'CYCLE_CLOSED') {
        showToast("Action Forbidden", err.message);
      } else {
        console.error(err);
      }
    }
  };

  const handleConfirmRejection = async (requestId: string, pmNote: string) => {
    try {
      await api.patch(`/crop-cycles/budget-requests/${requestId}/reject`, { pmNote });
      fetchFull();
      refreshPendingRequests();
      refreshCycles();
      if (onCycleUpdated) onCycleUpdated();
    } catch (err) { console.error(err); }
  };

  const handleRejectRequest = (requestId: string) => {
    setRejectionModalConfig({ isOpen: true, requestId });
  };

  const handleVerifyForecast = async (forecastId: string, pmReply: string) => {
    try {
      await api.patch(`/crop-cycles/yield-forecasts/${forecastId}/verify`, { pmReply });
      fetchFull();
      refreshPendingForecasts();
      if (onCycleUpdated) onCycleUpdated();
    } catch (err) { console.error(err); }
  };

  const handleFlagReport = async (reportId: string, reason: string) => {
    try {
      await api.patch(`/crop-cycles/field-reports/${reportId}/flag`, { reason });
      fetchFull();
      refreshPendingReports();
      setSelectedFieldReport(null);
      if (onCycleUpdated) onCycleUpdated();
    } catch (err) { console.error(err); }
  };

  const handleCloseCycle = async (finalYield: string) => {
    try {
      await api.patch(`/crop-cycles/${cycle._id}/close`, { finalYield });
      setCycleStatus('completed');
      setIsConfirmCloseOpen(false);
      setActiveTab('overview');
      if (onCloseCycle) onCloseCycle(finalYield);
      if (onCycleUpdated) onCycleUpdated();
      fetchFull();
      refreshCycles();
    } catch (err) { console.error(err); }
  };

  const handleAdjustBudget = async (categoryName: string, newAllocated: number) => {
    try {
      await api.patch(`/crop-cycles/${cycle._id}/adjust-budget`, { categoryName, newAllocated });
      fetchFull();
      refreshCycles();
      setIsAdjustBudgetOpen(false);
      if (onCycleUpdated) onCycleUpdated();
    } catch (err) { console.error(err); }
  };

  const handleCloseAttempt = () => {
    const pendingCount = budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length;
    if (pendingCount > 0) {
      showToast("Pending Requests Found", `There are ${pendingCount} pending budget requests for this cycle. Reject or approve them before closing.`);
      return;
    }
    setIsConfirmCloseOpen(true);
  };

  // ─── Export Logic ────────────────────────────────────────────────
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const toTitleCase = (str: string) => str?.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A';

    // Helper: create a styled worksheet
    const makeSheet = (headers: string[], rows: (string | number)[][]) => {
      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
        return { wch: Math.min(maxLen + 4, 40) };
      });
      return ws;
    };

    // Sheet 1: Overview
    const overviewWs = makeSheet(
      ['Metric', 'Value'],
      [
        ['Cycle ID', displayCycleId],
        ['Crop', displayCrop],
        ['Farmer', displayFarmer],
        ['Status', toTitleCase(cycleStatus)],
        ['Land Size', displayLandSize],
        ['Start Date', displayStartDate],
        ['Harvest Date', displayEndDate],
        ['Yield Goal', displayYieldGoal],
        ['Total Budget', `${displayBudget.toLocaleString()} Rwf`],
        ['Approved Budget', `${totalApproved.toLocaleString()} Rwf`],
        ['Total Spent', `${totalSpent.toLocaleString()} Rwf`],
        ['Progress (%)', `${displayBudget > 0 ? Math.round((totalApproved / displayBudget) * 100) : 0}%`]
      ]
    );
    XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

    // Sheet 2: Budget Categories
    const catWs = makeSheet(
      ['Category Name', 'Allocated (Rwf)', 'Approved (Rwf)', 'Spent (Rwf)', 'Variance (Rwf)'],
      budgetCategories.map((c: any) => [
        c.name,
        c.allocated || 0,
        c.approved || 0,
        c.spent || 0,
        (c.allocated || 0) - (c.spent || 0)
      ])
    );
    XLSX.utils.book_append_sheet(wb, catWs, 'Financials');

    // Sheet 3: Budget Requests
    const reqWs = makeSheet(
      ['Date', 'Submitted By', 'Period', 'Activities', 'Amount (Rwf)', 'Status', 'PM Note'],
      budgetRequests.map((r: any) => [
        formatDate(r.createdAt),
        r.submittedByName || 'Farm Manager',
        `${formatDate(r.startDate)} - ${formatDate(r.endDate)}`,
        (r.lineItems?.map((li: any) => li.activityName) || []).join('; '),
        r.totalRequestedRwf || 0,
        toTitleCase(r.approvalStatus),
        r.pmNote || ''
      ])
    );
    XLSX.utils.book_append_sheet(wb, reqWs, 'Budget Requests');

    if (hasPnL) {
      const pnlWs = makeSheet(
        ['Metric', 'Projected', 'Actual'],
        [
          ['Yield (kg)',       yieldGoalKg,   finalYieldKg || 'N/A'],
          ['Selling Price (Rwf/kg)', pricePerKg, pricePerKg],
          ['Revenue (Rwf)',   projRevenue,   finalYieldKg ? actualRevenue : 'N/A'],
          ['Production Cost (Rwf)', displayBudget, totalSpent],
          ['Profit (Rwf)',    projProfit,    finalYieldKg ? actualProfit : 'N/A'],
          ['Profit Margin (%)', `${projMargin.toFixed(1)}%`, finalYieldKg ? `${actualMargin.toFixed(1)}%` : 'N/A'],
          ['Cost per kg (Rwf)', Math.round(projCostPerKg), finalYieldKg ? Math.round(actualCostPerKg) : 'N/A'],
        ]
      );
      XLSX.utils.book_append_sheet(wb, pnlWs, 'P&L Summary');
    }

    // Sheet 4: Yield Forecasts
    if (forecasts.length > 0) {
      const forecastWs = makeSheet(
        ['Submission Date', 'Harvest Date', 'Predicted (kg)', 'Confidence', 'Status', 'Notes'],
        forecasts.map((f: any) => [
          formatDate(f.createdAt),
          formatDate(f.harvestDate),
          f.predictionKg || 0,
          f.confidence || '',
          toTitleCase(f.status),
          f.notes || ''
        ])
      );
      XLSX.utils.book_append_sheet(wb, forecastWs, 'Yield Forecasts');
    }

    XLSX.writeFile(wb, `Sarura_Cycle_${displayCycleId}_Report.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = formatDateTime(new Date());
    const toTitleCase = (str: string) => str?.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A';

    // 1. Standard Branded Header
    try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch { }
    doc.setTextColor(21, 128, 61); // Sarura Green
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Fresh Sarura', 28, 19);
    doc.setTextColor(107, 114, 128); // Gray
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.text('Export & Farmer Hub', 28, 23);
    
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
    
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 30, pageWidth - 15, 30);

    // 2. Report Title & Cycle Identity
    doc.setTextColor(17, 24, 39); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`CROP PRODUCTION REPORT - ${displayCycleId}`, 15, 42);

    // 3. Overview Summary Section
    const summaryFields = [
      { label: 'Cultivated Crop', value: toTitleCase(displayCrop) },
      { label: 'Assigned Farmer', value: toTitleCase(displayFarmer) },
      { label: 'Land Size / Plot', value: displayLandSize },
      { label: 'Current Status', value: toTitleCase(cycleStatus) },
      { label: 'Production Timeline', value: `${displayStartDate} – ${displayEndDate}` },
      { label: 'Target Yield Goal', value: displayYieldGoal }
    ];

    let yPos = 58;
    doc.setFontSize(9);
    summaryFields.forEach(field => {
      doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
      doc.text(field.label, 15, yPos);
      doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
      doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
      doc.setDrawColor(243, 244, 246);
      doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
      yPos += 10;
    });

    const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
    const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
    const alternateRowStyles: any = { fillColor: [249, 250, 251] };

    // 4. Financial Performance Table
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
    doc.text('FINANCIAL PERFORMANCE BY CATEGORY', 15, yPos + 8);
    
    autoTable(doc, {
      startY: yPos + 13,
      head: [['CATEGORY', 'ALLOCATED', 'APPROVED', 'ACTUAL SPENT', 'VARIANCE']],
      body: budgetCategories.map((c: any) => [
        toTitleCase(c.name),
        `${(c.allocated || 0).toLocaleString()} Rwf`,
        `${(c.approved || 0).toLocaleString()} Rwf`,
        `${(c.spent || 0).toLocaleString()} Rwf`,
        `${((c.allocated || 0) - (c.spent || 0)).toLocaleString()} Rwf`
      ]),
      theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
      margin: { left: 15, right: 15 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = parseInt(String(data.cell.raw).replace(/[^0-9-]/g, ''));
          if (val < 0) data.cell.styles.textColor = '#dc2626'; // Red for overdraft
          else data.cell.styles.textColor = '#16a34a'; // Green for under budget
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 5. P&L Summary Table
    if (hasPnL) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
      doc.text(isClosed ? 'ACTUAL PROFIT & LOSS' : 'PROJECTED PROFIT & LOSS', 15, yPos);

      autoTable(doc, {
        startY: yPos + 5,
        head: [['METRIC', 'PROJECTED', isClosed ? 'ACTUAL' : 'CURRENT (TO DATE)']],
        body: [
          ['Yield (kg)',         `${fmt(yieldGoalKg)} kg`,              `${fmt(finalYieldKg)} kg`],
          ['Selling Price',      `${fmt(pricePerKg)} Rwf/kg`,           `${fmt(pricePerKg)} Rwf/kg`],
          ['Revenue',            `${fmt(projRevenue)} Rwf`,             `${fmt(actualRevenue)} Rwf`],
          ['Production Cost',    `${fmt(displayBudget)} Rwf`,           `${fmt(totalSpent)} Rwf`],
          ['Profit / Loss',      `${projProfit >= 0 ? '+' : ''}${fmt(projProfit)} Rwf`, `${actualProfit >= 0 ? '+' : ''}${fmt(actualProfit)} Rwf`],
          ['Profit Margin',      `${projMargin.toFixed(1)}%`,           `${actualMargin.toFixed(1)}%`],
          ['Cost per kg',        `${fmt(projCostPerKg)} Rwf`,           `${fmt(actualCostPerKg)} Rwf`],
        ],
        theme: 'striped',
        headStyles: commonHeadStyles,
        bodyStyles: commonBodyStyles,
        alternateRowStyles,
        margin: { left: 15, right: 15 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === 4) {
            // Profit row — color based on value (Col 1: Projected, Col 2: Actual)
            const isProj   = data.column.index === 1;
            const isActual = data.column.index === 2;
            const val      = isProj ? projProfit : (isActual ? actualProfit : 0);
            
            if ((isProj || isActual) && val < 0) {
              data.cell.styles.textColor = '#dc2626'; // Red
            } else if ((isProj || isActual) && val > 0) {
              data.cell.styles.textColor = '#16a34a'; // Green
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // 5. Recent Budget Requests (Detailed Table)
    if (budgetRequests.length > 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('BUDGET ACTIVITY LOG (RECENT)', 15, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['DATE', 'ACTIVITIES', 'REQUESTED AMOUNT', 'APPROVAL STATUS']],
        body: budgetRequests.slice(0, 15).map((r: any) => [
          formatDate(r.createdAt),
          (r.lineItems?.map((li: any) => li.activityName) || []).join(', ').slice(0, 50),
          `${(r.totalRequestedRwf || 0).toLocaleString()} Rwf`,
          toTitleCase(r.approvalStatus)
        ]),
        theme: 'striped', headStyles: commonHeadStyles,
        bodyStyles: commonBodyStyles, alternateRowStyles,
        margin: { left: 15, right: 15, bottom: 30 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // 6. Field Activity Log (with images)
    if (fieldReports.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('FIELD ACTIVITY & EVIDENCE LOG', 15, yPos);

      for (const report of fieldReports.slice(0, 10)) { // Limit to 10 for reasonable size
        yPos += 10;
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`${formatDate(report.createdAt)} — ${report.description}`, 15, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`Category: ${report.category || 'General'} | Cost: ${(report.actualCostRwf || 0).toLocaleString()} Rwf`, 15, yPos + 5);
        
        if (report.notes) {
          doc.setFontSize(8); doc.setTextColor(107, 114, 128);
          doc.text(`Notes: ${report.notes}`, 15, yPos + 9, { maxWidth: 100 });
          yPos += 4;
        }

        if (report.proofUrl) {
          const base64 = await getBase64FromUrl(report.proofUrl);
          if (base64) {
            try {
              // Add a thumbnail to the right
              doc.addImage(base64, 'JPEG', pageWidth - 65, yPos - 5, 50, 30, undefined, 'FAST');
              yPos += 20; // Extra space for image height
            } catch (e) {
              console.warn("Failed to add image to PDF", e);
            }
          }
        }
        
        doc.setDrawColor(243, 244, 246);
        doc.line(15, yPos + 10, pageWidth - 15, yPos + 10);
        yPos += 10;
        doc.setTextColor(17, 24, 39);
      }
    }

    // 6. System Insights
    let lastY = (doc as any).lastAutoTable?.finalY || yPos;
    if (lastY > 240) { doc.addPage(); lastY = 20; }
    doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
    doc.text('• This report aggregates crop cycle performance and budget utilization.', 15, lastY + 25);
    doc.text(`• Status: ${toTitleCase(cycle.status)}`, 15, lastY + 31);

    // 7. Standard Platform Footer
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

    doc.save(`Sarura_Production_Report_${displayCycleId}.pdf`);
    setShowExportMenu(false);
  };

  // ─── Helpers ──────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':     return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'planned':    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'in_progress':
      case 'harvesting': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:           return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const fmt = (n: number) => (n || 0).toLocaleString();
  const fmtDate = (d: string) => formatDate(d);

  // Display values — normalise shape from DB vs passed-in cycle prop
  const displayCrop       = fullData?.cycle?.crop_name || cycle.crop || '—';
  const displayLandSize   = fullData?.cycle?.block_size_hectares ? `${fullData.cycle.block_size_hectares} Ha` : cycle.landSize || '—';
  const displayStartDate  = fmtDate(fullData?.cycle?.planting_date || cycle.planting_date);
  const displayEndDate    = fmtDate(fullData?.cycle?.expected_harvest_date || cycle.expected_harvest_date);
  const displayCycleId    = fullData?.cycle?.cycleId || cycle.cycleId || cycle._id;
  const displayBudget     = fullData?.cycle?.total_budget || cycle.budget || 0;
  const displaySpent      = fullData?.cycle?.spent || cycle.spent || 0;
  const displayYieldGoal  = fullData?.cycle?.yield_goal_kg ? `${fullData.cycle.yield_goal_kg.toLocaleString()} kg` : cycle.yieldGoal || '—';
  const displayFarmer     = fullData?.cycle?.farmer_id?.full_name || '—';
  
  const yieldGoalKg        = fullData?.cycle?.yield_goal_kg || cycle.yield_goal_kg || 0;
  const finalYieldKg       = fullData?.cycle?.final_yield || 0;
  const pricePerKg         = fullData?.cycle?.expected_price_per_kg || cycle.expected_price_per_kg || 0;
  const projRevenue        = yieldGoalKg * pricePerKg;
  const actualRevenue      = finalYieldKg * pricePerKg;
  const projProfit         = projRevenue - displayBudget;
  const actualProfit       = actualRevenue - totalSpent;
  const projMargin         = projRevenue > 0 ? (projProfit / projRevenue) * 100 : 0;
  const actualMargin       = actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : 0;
  const projCostPerKg      = yieldGoalKg > 0 ? displayBudget / yieldGoalKg : 0;
  const actualCostPerKg    = finalYieldKg > 0 ? totalSpent / finalYieldKg : 0;
  const hasPnL             = pricePerKg > 0 && yieldGoalKg > 0;

  const isClosed = (cycleStatus || '').toLowerCase() === 'completed';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[85vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-xl text-green-600 dark:text-green-400">
              <Sprout size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  {displayCycleId}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(cycleStatus)} ${['in_progress', 'harvesting'].includes((cycleStatus || '').toLowerCase()) ? 'animate-pulse' : ''}`}>
                  {['in_progress', 'harvesting'].includes((cycleStatus || '').toLowerCase()) ? 'In Progress' : cycleStatus}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {displayCrop} • Managed by {displayFarmer} • {displayLandSize} • {displayStartDate} – {displayEndDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isClosed ? (
              <button disabled className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-not-allowed">
                <Lock size={14} /> Cycle Closed
              </button>
            ) : (
              <button
                onClick={handleCloseAttempt}
                title="Mark this cycle as completed. All pending requests must be resolved first."
                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-red-100 dark:border-red-800/50"
              >
                Close Crop Cycle
              </button>
            )}
            <span className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm text-xs font-bold"
              >
                <Download size={14} />
                Export Data
                
              </button>

              
            </div>

            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="px-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="flex gap-6">
            {(['overview', 'financials', 'requests', 'forecasts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 transition-all capitalize ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'requests' ? (
                  <span className="flex items-center gap-1.5">
                    Budget Requests
                    {budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length}
                      </span>
                    )}
                  </span>
                ) : tab === 'forecasts' ? 'Yield Forecasts' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/30 dark:bg-gray-900/10">

          {loadingFull && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-green-500" />
            </div>
          )}

          {!loadingFull && activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Target size={18} /></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Yield Goal</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayYieldGoal}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> On track</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Coins size={18} /></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Used</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {displayBudget > 0 ? `${Math.round((displaySpent / displayBudget) * 100)}%` : '0%'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{fmt(displaySpent)} Rwf / {fmt(displayBudget)} Rwf</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Activity size={18} /></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Requests</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{budgetRequests.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length} pending approval
                  </p>
                </div>
              </div>

              {/* Cycle Progress */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cycle Progress</h3>
                  {(() => {
                    const cycleProgress = displayBudget > 0
                      ? Math.min(Math.round((totalApproved / displayBudget) * 100), 100)
                      : 0;
                    return (
                      <span className={`text-sm font-bold ${cycleProgress >= 90 ? 'text-amber-600' : 'text-green-600'}`}>
                        {cycleProgress}% budget approved
                      </span>
                    );
                  })()}
                </div>
                {['in_progress', 'harvesting'].includes((cycleStatus || '').toLowerCase()) && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <span className="animate-pulse w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Cycle is in progress — budget requests are being reviewed and field work is underway.
                  </div>
                )}
                {isClosed && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-semibold flex items-center gap-2">
                    <Lock size={12} /> This cycle has been closed and is now read-only.
                  </div>
                )}
                <div className="relative pt-2 pb-2">
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    {(() => {
                      const cycleProgress = displayBudget > 0
                        ? Math.min(Math.round((totalApproved / displayBudget) * 100), 100)
                        : 0;
                      return (
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isClosed ? 'bg-gray-400' :
                            ['in_progress', 'harvesting'].includes((cycleStatus || '').toLowerCase()) ? 'bg-amber-500' :
                            cycleProgress >= 90 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: isClosed ? '100%' : `${cycleProgress}%` }}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex justify-between mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <span className="block text-green-600">Started</span>
                      {displayStartDate}
                    </div>
                    <div className="text-center">
                      <span className="block font-bold text-gray-900 dark:text-white">Current Stage</span>
                      {['in_progress', 'harvesting'].includes((cycleStatus || '').toLowerCase()) ? 'In Progress' : isClosed ? 'Closed' : 'Active'}
                    </div>
                    <div className="text-center">
                      <span className="block text-gray-400">Harvest</span>
                      {displayEndDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Field Activity */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Field Activity</h3>
                  <button onClick={() => setActiveTab('financials')} className="text-xs text-green-600 dark:text-green-400 font-bold hover:underline">View All</button>
                </div>
                {fieldReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No field reports submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fieldReports.slice(0, 3).map((report: any) => (
                      <div
                        key={report._id}
                        onClick={() => setSelectedFieldReport(report)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-100">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{report.description}</p>
                            <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">
                              {new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mb-0.5">
                            {report.category || 'General'} · Submitted by {report.submittedByName || 'Farm Manager'}
                          </p>
                          {report.notes && (
                            <p className="text-xs text-gray-500 line-clamp-2">"{report.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasPnL && (
                <div className={`rounded-2xl border p-6 shadow-sm ${
                  (isClosed ? actualProfit : projProfit) >= 0
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {isClosed ? 'Actual P&L' : 'Projected P&L'}
                    </h3>
                    {isClosed && finalYieldKg > 0 && (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        Final yield: {fmt(finalYieldKg)} kg
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          {isClosed ? 'Actual revenue' : 'Expected revenue'}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">
                          {fmt(isClosed ? actualRevenue : projRevenue)} Rwf
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          {isClosed ? 'Actual cost' : 'Production budget'}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">
                          {fmt(isClosed ? totalSpent : displayBudget)} Rwf
                        </span>
                      </div>
                      <div className="h-px bg-gray-200 dark:bg-gray-600" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {isClosed ? 'Net profit' : 'Est. profit'}
                        </span>
                        <span className={`font-bold text-lg ${
                          (isClosed ? actualProfit : projProfit) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {(isClosed ? actualProfit : projProfit) >= 0 ? '+' : ''}
                          {fmt(isClosed ? actualProfit : projProfit)} Rwf
                        </span>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Profit margin</span>
                        <span className={`font-bold ${
                          (isClosed ? actualMargin : projMargin) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {(isClosed ? actualMargin : projMargin).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Cost per kg</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">
                          {fmt(isClosed ? actualCostPerKg : projCostPerKg)} Rwf
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Selling price</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">{fmt(pricePerKg)} Rwf/kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          {isClosed ? 'Yield achieved' : 'Yield target'}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">
                          {fmt(isClosed ? finalYieldKg : yieldGoalKg)} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Projected vs Actual comparison row — only show when cycle is closed and both exist */}
                  {isClosed && yieldGoalKg > 0 && finalYieldKg > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 grid grid-cols-3 gap-4 text-xs text-center">
                      <div>
                        <p className="text-gray-400 mb-1">Yield vs Target</p>
                        <p className={`font-bold text-sm ${finalYieldKg >= yieldGoalKg ? 'text-green-600' : 'text-red-500'}`}>
                          {finalYieldKg >= yieldGoalKg ? '+' : ''}{fmt(finalYieldKg - yieldGoalKg)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Revenue vs Projected</p>
                        <p className={`font-bold text-sm ${actualRevenue >= projRevenue ? 'text-green-600' : 'text-red-500'}`}>
                          {actualRevenue >= projRevenue ? '+' : ''}{fmt(actualRevenue - projRevenue)} Rwf
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Profit vs Projected</p>
                        <p className={`font-bold text-sm ${actualProfit >= projProfit ? 'text-green-600' : 'text-red-500'}`}>
                          {actualProfit >= projProfit ? '+' : ''}{fmt(actualProfit - projProfit)} Rwf
                        </p>
                      </div>
                    </div>
                  )}

                  {!isClosed && (
                    <p className="text-xs text-gray-400 mt-3">
                      Estimates based on yield goal of {fmt(yieldGoalKg)} kg at {fmt(pricePerKg)} Rwf/kg. Actuals will be calculated on cycle close.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!loadingFull && activeTab === 'financials' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Global Summary Banner */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Global Financial Summary</h3>
                    <div className="flex flex-wrap items-end gap-6 sm:gap-8">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Total Allocated</p>
                        <p className="text-2xl font-bold text-white">{fmt(totalAllocated)} Rwf</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Total Approved</p>
                        <p className="text-2xl font-bold text-white">{fmt(totalApproved)} Rwf</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Actual Cost</p>
                        <p className="text-2xl font-bold text-white">{fmt(totalSpent)} Rwf</p>
                      </div>
                      <div className="border-l border-gray-600 pl-6">
                        <p className="text-gray-400 text-xs mb-1">Global Variance</p>
                        <p className={`text-2xl font-bold ${globalVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {globalVariance > 0 ? '+' : ''}{fmt(globalVariance)} Rwf
                        </p>
                      </div>
                    </div>
                  </div>
                  {!isClosed && (
                    <button
                      onClick={() => setIsAdjustBudgetOpen(true)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
                    >
                      <Plus size={14} /> Adjust Budget
                    </button>
                  )}
                </div>
              </div>

              {hasPnL && (
                <div className={`rounded-xl border p-5 ${
                  (isClosed ? actualProfit : projProfit) >= 0
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
                }`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    {isClosed ? 'Actual P&L Summary' : 'Projected P&L Summary'}
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">{isClosed ? 'Actual Revenue' : 'Projected Revenue'}</p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">{fmt(isClosed ? actualRevenue : projRevenue)} Rwf</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(pricePerKg)} Rwf/kg × {fmt(isClosed ? finalYieldKg : yieldGoalKg)} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">{isClosed ? 'Actual Cost' : 'Production Budget'}</p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">{fmt(isClosed ? totalSpent : displayBudget)} Rwf</p>
                      <p className="text-xs text-gray-400 mt-0.5">Cost/kg: {fmt(isClosed ? actualCostPerKg : projCostPerKg)} Rwf</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">{isClosed ? 'Net Profit' : 'Est. Profit'}</p>
                      <p className={`font-bold text-lg ${(isClosed ? actualProfit : projProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {(isClosed ? actualProfit : projProfit) >= 0 ? '+' : ''}{fmt(isClosed ? actualProfit : projProfit)} Rwf
                      </p>
                      <p className={`text-xs font-bold ${(isClosed ? actualMargin : projMargin) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(isClosed ? actualMargin : projMargin).toFixed(1)}% margin
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Cards */}
              {budgetCategories.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {budgetCategories.map((cat: any, idx: number) => {
                    const variance = (cat.allocated || 0) - (cat.spent || 0);
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                          <div className="text-right">
                            <span className={`text-xs font-bold block ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {variance > 0 ? '+' : ''}{fmt(variance)} diff
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Approved: {fmt(cat.approved || 0)}</span>
                          </div>
                        </div>
                        <div className="mt-auto">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{fmt(cat.spent)} actual</span>
                            <span>{fmt(cat.allocated)} allocated</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${variance < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, ((cat.spent || 0) / (cat.allocated || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <Coins size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No budget categories found.</p>
                </div>
              )}

              {/* Field Reports / Transactions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Expense Log (All Field Reports)</h3>
                  <button onClick={() => setIsLedgerOpen(true)} className="text-xs text-blue-600 font-medium hover:underline">
                    View Full Ledger
                  </button>
                </div>
                {fieldReports.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No expenses logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {fieldReports.map((report: any) => (
                      <div
                        key={report._id}
                        onClick={() => setSelectedFieldReport(report)}
                        className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-dashed border-gray-100 dark:border-gray-700 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                            <Coins size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{report.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(report.createdAt)} • {report.category || 'General'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-200">
                          -{fmt(report.actualCostRwf)} Rwf
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loadingFull && activeTab === 'requests' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-gray-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Budget Requests</h3>
                {budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {budgetRequests.filter((r: any) => r.approvalStatus === 'Pending').length} pending
                  </span>
                )}
              </div>

              {budgetRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <ClipboardList size={24} className="text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">No Pending Requests</p>
                  <p className="text-xs text-gray-400 mt-1">Farm managers haven't submitted any activity requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgetRequests.map((req: any) => {
                    const primaryCatName = req.lineItems?.[0]?.category || 'General';
                    const catInfo = budgetCategories.find((c: any) => c.name === primaryCatName);
                    
                    // Specific category unallocated if found, global fallback otherwise
                    const usedUnallocated = catInfo 
                      ? (catInfo.allocated - (catInfo.spent || 0)) 
                      : (displayBudget - displaySpent);
                    
                    const catLabel = catInfo ? `${catInfo.name} Remaining` : 'Unallocated Remaining';

                    const isApproved = req.approvalStatus === 'Approved';
                    const isRejected = req.approvalStatus === 'Rejected';
                    const isPending  = req.approvalStatus === 'Pending';

                    return (
                      <div key={req._id} className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all ${
                        isApproved ? 'border-green-300 dark:border-green-700' :
                        isRejected ? 'border-red-200 dark:border-red-800 opacity-70' :
                        'border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-start justify-between px-5 py-4 bg-gray-50/60 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{req.submittedByName || 'Farm Manager'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isApproved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                isRejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>{req.approvalStatus}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Period: {fmtDate(req.startDate)} – {fmtDate(req.endDate)} &nbsp;•&nbsp;
                              Submitted: {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="px-5 py-3">
                          <table className="w-full text-left text-xs">
                             <thead>
                              <tr className="text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-2 pr-4">Activity</th>
                                <th className="pb-2 px-2">Category</th>
                                <th className="pb-2 text-right">Est. Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                              {req.lineItems?.map((item: any, i: number) => (
                                <tr key={i}>
                                  <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{item.activityName}</td>
                                  <td className="py-2 px-2 text-gray-500">{item.category}</td>
                                  <td className="py-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(item.estimatedCostRwf)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-gray-900/20">
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Total Requested</span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(req.totalRequestedRwf)} Rwf</span>
                            </div>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
                             <div>
                              <span className="block text-[10px] uppercase text-gray-400 mb-0.5">{catLabel}</span>
                              <span className={`font-bold ${usedUnallocated < req.totalRequestedRwf ? 'text-red-600' : 'text-green-600'}`}>
                                {fmt(usedUnallocated)} Rwf
                              </span>
                            </div>
                            {usedUnallocated < req.totalRequestedRwf && (
                              <span className="flex items-center gap-1 text-red-500 text-[10px] font-semibold">
                                <AlertCircle size={11} /> Exceeds budget!
                              </span>
                            )}
                          </div>

                          {isPending && !isClosed && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectRequest(req._id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 text-xs font-bold hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all font-sans"
                              >
                                <ThumbsDown size={13} /> Reject
                              </button>
                              <button
                                onClick={() => handleApproveRequest(req._id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md transition-all font-sans"
                              >
                                <ThumbsUp size={13} /> Approve
                              </button>
                            </div>
                          )}
                          {isApproved && (
                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                              <CheckCircle2 size={14} /> Approved — tasks added to FM checklist
                            </div>
                          )}
                          {isRejected && (
                            <div className="flex flex-col gap-1 text-red-500">
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <AlertCircle size={14} /> Rejected
                              </div>
                              {req.pmNote && (
                                <p className="text-[10px] bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-800/30 break-words whitespace-normal max-w-xs">
                                  Rejection note: {req.pmNote}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loadingFull && activeTab === 'forecasts' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-gray-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Yield Forecasts</h3>
              </div>

              {forecasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp size={28} className="text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">No Forecasts Submitted</p>
                  <p className="text-xs text-gray-400 mt-1">Farm managers haven't submitted yield forecasts yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {forecasts.map((f: any) => (
                    <div key={f._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            f.status === 'Verified'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-yellow-50 text-yellow-600 border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>{f.status}</span>
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted by {f.submittedByName || 'Farm Manager'} · {formatDate(f.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Expected Harvest</p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{fmtDate(f.harvestDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Expected Quantity</p>
                          <p className="font-mono text-gray-800 dark:text-gray-200">{fmt(f.predictionKg)} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Confidence</p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{f.confidence}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-1">Notes</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600/50">
                          {f.notes || 'No notes provided.'}
                        </p>
                      </div>

                      {f.status === 'Pending' && !isClosed && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                          <div>
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Reply Note (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Acknowledged. Logistics informed."
                              value={replyText[f._id] || ''}
                              onChange={e => setReplyText(prev => ({ ...prev, [f._id]: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleVerifyForecast(f._id, replyText[f._id] || '')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 size={14} /> Mark as Verified
                            </button>
                          </div>
                        </div>
                      )}
                      {f.status === 'Verified' && f.pmReply && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-400 mb-1">Your Reply</p>
                          <p className="text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            {f.pmReply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-none p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Last updated: Just now</span>
            <span className="font-mono">ID: #{cycle._id || cycle.id}</span>
          </div>
        </div>
      </div>

      {/* ── Sub-modals ── */}
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} cycleName={displayCrop} />
      <BudgetLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        budgetCategories={budgetCategories}
        fieldReports={fieldReports}
        cycleName={displayCrop}
        farmName={cycle.farm_name || '—'}
        season={cycle.season || '—'}
      />
      <FieldReportDetailsModal
        isOpen={!!selectedFieldReport}
        onClose={() => setSelectedFieldReport(null)}
        report={selectedFieldReport}
        isReadOnly={isClosed}
        onFlag={(reason: string) => selectedFieldReport?._id && handleFlagReport(selectedFieldReport._id, reason)}
        cycleId={displayCycleId}
      />
      <EvidenceViewModal
        isOpen={!!selectedEvidenceTask}
        onClose={() => setSelectedEvidenceTask(null)}
        task={selectedEvidenceTask}
        onApprove={() => setSelectedEvidenceTask(null)}
        onReject={() => setSelectedEvidenceTask(null)}
      />
      <AdjustBudgetModal
        isOpen={isAdjustBudgetOpen}
        onClose={() => setIsAdjustBudgetOpen(false)}
        categories={budgetCategories}
        onAdjust={handleAdjustBudget}
      />
      <ConfirmCloseModal
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={handleCloseCycle}
      />
      <FieldReportDetailsModal
        isOpen={!!selectedFieldReport}
        onClose={() => setSelectedFieldReport(null)}
        report={selectedFieldReport}
        isReadOnly={isClosed}
        onFlag={(reason: string) => selectedFieldReport?._id && handleFlagReport(selectedFieldReport._id, reason)}
      />
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
        onAdjust={() => { setOverdraftWarning(null); setIsAdjustBudgetOpen(true); }}
      />

    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline sub-modals
// ─────────────────────────────────────────────────────────────────────────────

const ReportModal = ({ isOpen, onClose, cycleName }: { isOpen: boolean; onClose: () => void; cycleName: string }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Generate Report</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Export a full summary report for <span className="font-semibold text-gray-900 dark:text-white">{cycleName}</span>.
        </p>
        <div className="space-y-2">
          {['PDF Summary', 'CSV Financials', 'Excel Full Report'].map(fmt => (
            <button key={fmt} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText size={16} className="text-gray-400" /> {fmt}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Export functionality coming soon.</p>
      </div>
    </div>,
    document.body
  );
};

const AdjustBudgetModal = ({
  isOpen, onClose, categories, onAdjust,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onAdjust: (name: string, value: number) => void;
}) => {
  const [selected, setSelected] = useState('');
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !value) return;
    onAdjust(selected, parseFloat(value));
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Adjust Budget Allocation</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select
              required
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a category…</option>
              {categories.map((c: any) => (
                <option key={c.name} value={c.name}>{c.name} (current: {(c.allocated || 0).toLocaleString()} Rwf)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Allocated Amount (Rwf)</label>
            <input
              type="number"
              required
              min={0}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. 250000"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors shadow-md">Save Adjustment</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const ConfirmCloseModal = ({
  isOpen, onClose, onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalYield: string) => void;
}) => {
  const [finalYield, setFinalYield] = useState('');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">Close Crop Cycle</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Closing this cycle marks it as <strong>Completed</strong> and locks all financial records. This action cannot be undone.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Final Yield (optional)</label>
            <input
              type="text"
              value={finalYield}
              onChange={e => setFinalYield(e.target.value)}
              placeholder="e.g. 4,500 kg"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button
              onClick={() => onConfirm(finalYield)}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-md"
            >
              Confirm &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FieldReportDetailsModal = ({
  isOpen, onClose, report, isReadOnly, onFlag, cycleId
}: {
  isOpen: boolean;
  onClose: () => void;
  report: any;
  isReadOnly: boolean;
  onFlag: (reason: string) => void;
  cycleId?: string;
}) => {
  const [flagReason, setFlagReason] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !report) return null;

  const handleDownloadReportPDF = async () => {
    setIsExporting(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = formatDateTime(new Date());

    // 1. Header
    try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch {}
    doc.setTextColor(21, 128, 61); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Fresh Sarura', 28, 19);
    doc.setTextColor(107, 114, 128); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.text('Export & Farmer Hub', 28, 23);
    doc.setFontSize(10); doc.setTextColor(17, 24, 39);
    doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
    doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
    doc.setDrawColor(229, 231, 235); doc.line(15, 30, pageWidth - 15, 30);

    // 2. Title
    doc.setTextColor(17, 24, 39); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('FIELD ACTIVITY REPORT', 15, 42);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Cycle ID: ${cycleId || 'N/A'} | Report ID: ${report._id?.slice(-8).toUpperCase()}`, 15, 47);

    // 3. Details
    const summaryFields = [
      { label: 'Date Submitted', value: formatDate(report.createdAt) },
      { label: 'Activity Description', value: report.description },
      { label: 'Category', value: report.category || 'General' },
      { label: 'Block / Location', value: report.block || 'Main Plot' },
      { label: 'Actual Cost (Rwf)', value: `${(report.actualCostRwf || 0).toLocaleString()} Rwf` },
      { label: 'Approved Amount (Rwf)', value: report.approvedAmountRwf ? `${(report.approvedAmountRwf).toLocaleString()} Rwf` : '—' },
      { label: 'Status', value: report.status || 'Pending' }
    ];

    let yPos = 58;
    doc.setFontSize(9);
    summaryFields.forEach(field => {
      doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
      doc.text(field.label, 15, yPos);
      doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
      doc.text(String(field.value), pageWidth - 15, yPos, { align: 'right' });
      doc.setDrawColor(243, 244, 246); doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
      yPos += 10;
    });

    if (report.notes) {
      doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
      doc.text('Manager Notes', 15, yPos);
      doc.setTextColor(17, 24, 39); doc.setFontSize(8.5);
      const splitNotes = doc.splitTextToSize(report.notes, pageWidth - 30);
      doc.text(splitNotes, 15, yPos + 5);
      yPos += (splitNotes.length * 5) + 10;
    }

    // 4. Evidence Image
    if (report.proofUrl) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
      doc.text('ATTACHED EVIDENCE', 15, yPos);
      const base64 = await getBase64FromUrl(report.proofUrl);
      if (base64) {
        try {
          const imgHeight = 80;
          const imgWidth = 120;
          if (yPos + imgHeight > 270) doc.addPage();
          doc.addImage(base64, 'JPEG', 15, yPos + 5, imgWidth, imgHeight);
        } catch (e) { console.warn(e); }
      }
    }

    // 5. Footer
    doc.setPage(1);
    doc.setDrawColor(229, 231, 235); doc.line(15, 275, pageWidth - 15, 275);
    doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
    doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const footerY = 288;
    doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Page 1 of 1`, pageWidth - 15, footerY, { align: 'right' });

    doc.save(`Sarura_FieldReport_${report._id?.slice(-8).toUpperCase()}.pdf`);
    setIsExporting(false);
  };

  if (!isOpen || !report) return null;

  const fmt = (n: number) => (n || 0).toLocaleString();

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Field Report</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDate(report.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReportPDF}
              disabled={isExporting}
              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all flex items-center gap-1.5"
              title="Download Report as PDF"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Download PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{report.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{report.category || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Block</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{report.block || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Actual Cost</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white">{fmt(report.actualCostRwf)} Rwf</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Approved Amount</p>
              <p className="font-mono font-medium text-gray-700 dark:text-gray-300">{report.approvedAmountRwf != null ? `${fmt(report.approvedAmountRwf)} Rwf` : '—'}</p>
            </div>
          </div>

          {report.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600/50">
                {report.notes}
              </p>
            </div>
          )}

          {/* Evidence Image Display */}
          {report.proofUrl && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Attached Evidence</p>
              <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <img 
                  src={report.proofUrl} 
                  alt="Field Evidence" 
                  className="w-full h-auto max-h-64 object-contain mx-auto"
                />
                <a 
                  href={report.proofUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-black/70 transition-colors"
                >
                  View Full Image
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              report.status === 'Flagged'   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              report.status === 'Cleared'   ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>{report.status}</span>
            {report.pmFlag && (
              <p className="text-xs text-red-500 font-medium">Flag note: {report.pmFlag}</p>
            )}
          </div>

          {!isReadOnly && report.status !== 'Flagged' && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              {!showFlagInput ? (
                <button
                  onClick={() => setShowFlagInput(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  Flag Report
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Reason for flagging…"
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-700 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-red-400 outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFlagInput(false)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button
                      onClick={() => { onFlag(flagReason); setFlagReason(''); setShowFlagInput(false); }}
                      disabled={!flagReason.trim()}
                      className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
                    >
                      Confirm Flag
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

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

export default CropCycleDetailModal;
