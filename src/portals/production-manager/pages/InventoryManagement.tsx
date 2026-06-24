import { useState, useEffect } from 'react';
import {
    Search, Filter, Download, Plus, MoreHorizontal,
    Package, Layers, Calendar,
    Leaf, Clock, ClipboardCheck,
    ChevronDown, FileSpreadsheet, FileText, User
} from 'lucide-react';
import CreateExportBatchModal from '../components/CreateExportBatchModal';
import BatchDetailModal from '../components/BatchDetailModal';
import StockDetailModal from '../components/StockDetailModal';
import AssignRoomModal from '../components/AssignRoomModal';
import Pagination from '../../shared/component/Pagination';
import PackagingStockPage from './PackagingStock';

import { api } from '../../../lib/api';
import { usePMContext } from '@/context/PMContext';
import { useToastContext } from '@/context/ToastContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/sarura_logo_nav.png';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { getReportFooterText } from '@/lib/utils';

const InventoryManagement = () => {
    const { 
        stock, refreshStock, 
        exportBatches, refreshExportBatches, 
        inventoryItems,
        shipments, refreshShipments,
        qcDoneBatches,
        refreshProcessingBatches
    } = usePMContext();
    const { showToast } = useToastContext();

    // Tab State: 'intake' | 'active_inventory' | 'export_batches' | 'recent_activity'
    const [activeTab, setActiveTab] = useState('recent_activity');

    // Modal States
    const [isExportBatchOpen, setIsExportBatchOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isStockDetailOpen, setIsStockDetailOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<any>(null);

    // Selected Item States
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [activityFeed, setActivityFeed] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    // New states for QC Confirmation
    const [selectedBatchForConfirm, setSelectedBatchForConfirm] = useState<any>(null);
    const [isAssignStockRoomModalOpen, setIsAssignStockRoomModalOpen] = useState(false);

    // Action Menu State
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Stock tab filter
    const [produceFilter, setProduceFilter] = useState<string>('all');
    const [roomFilter, setRoomFilter] = useState<string>('all');
    // Global search & filters
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
    const [timeRangeFilter, setTimeRangeFilter] = useState<string>('all');
    const [exportClientFilter, setExportClientFilter] = useState<string>('all');
    const [exportStatusFilter, setExportStatusFilter] = useState<string>('all');
    const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    // Pagination
    const [inventoryPage, setInventoryPage] = useState(1);
    const [exportPage, setExportPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);
    const itemsPerPage = 5;





    // (Removed local fetchQcDoneBatches, using PMContext instead)









    // Fetch packaging status for the banner — lightweight summary call
    const [packagingAlert, setPackagingAlert] = useState<'empty' | 'critical' | 'low' | null>(null);

    useEffect(() => {
        api.get('/packaging/summary')
            .then(res => {
                const total = res.data?.data?.totalAvailableBoxes ?? null;
                if (total === null) return;
                if (total === 0) setPackagingAlert('empty');
                else if (total < 50) setPackagingAlert('critical');
                else if (total < 500) setPackagingAlert('low');
                else setPackagingAlert(null);
            })
            .catch(() => {});
    }, []);

    const fetchActivityFeed = async () => {
        setActivityLoading(true);
        try {
            const [declarationsRes, allBatchesRes, exportRes, shipmentsRes] =
                await Promise.allSettled([
                    api.get('/harvest-declarations'),
                    api.get('/processing-batches'),   // single call now — returns all
                    api.get('/export-batches'),
                    api.get('/shipments'),
                ]);

            const events: any[] = [];

            // 1. Harvest Declarations → "Harvest Declared" + "Pickup Logged"
            if (declarationsRes.status === 'fulfilled') {
                const declarations = declarationsRes.value.data || declarationsRes.value || [];
                declarations.forEach((d: any) => {
                    // Farmer declared harvest
                    events.push({
                        id: `hd-${d._id}`,
                        timestamp: new Date(d.createdAt || Date.now()),
                        type: 'Harvest Declared',
                        description: `${d.farmerId?.full_name || d.farmName || 'Farmer'} declared harvest of ${d.cropName}${d.farmName ? ` from ${d.farmName}` : ''}`,
                        impact: `~${d.estimatedWeightKg} kg est.`,
                        impactType: 'positive',
                        actor: d.declaredBy?.full_name || d.declaredBy?.role || 'Farm Manager',
                        ref: d.cycleId?.cycleId || '',
                    });

                    // Pickup logged (if already picked up)
                    if (d.status === 'PickedUp' && d.intakeLogId) {
                        const intake = d.intakeLogId;
                        events.push({
                            id: `il-${d._id}`,
                            timestamp: new Date(intake.arrivedAt || intake.createdAt || d.updatedAt),
                            type: 'Pickup Logged',
                            description: `Logistics picked up ${intake.pickedUpWeightKg ?? d.estimatedWeightKg} kg ${d.cropName} from ${d.farmerId?.full_name || d.farmName || 'farmer'}${intake.truckId ? ` — Truck ${intake.truckId}` : ''}`,
                            impact: `+${intake.pickedUpWeightKg ?? d.estimatedWeightKg} kg received`,
                            impactType: 'positive',
                            actor: intake.loggedBy?.full_name || intake.loggedBy?.role || 'Logistics Officer',
                            ref: typeof d.intakeLogId === 'object' ? d.intakeLogId._id?.toString().slice(-8) : '',
                        });
                    }
                });
            }

            // 2. ALL Processing Batches — one event per status per batch
            if (allBatchesRes.status === 'fulfilled') {
                const batches = allBatchesRes.value.data?.data 
                    || allBatchesRes.value.data 
                    || allBatchesRes.value 
                    || [];

                batches.forEach((b: any) => {
                    // Every batch starts with a Room Request event (createdAt)
                    events.push({
                        id: `pb-rr-${b._id}`,
                        timestamp: new Date(b.createdAt),
                        type: 'Room Requested',
                        description: `QC requested cold room for ${b.cropName || 'batch'} — ${b.receivedWeightKg ?? '?'} kg awaiting assignment`,
                        impact: `${b.receivedWeightKg ?? '?'} kg pending`,
                        impactType: 'neutral',
                        actor: b.requestedBy?.name || 'QC Officer',
                        ref: '',
                    });

                    // If room was assigned by PM → separate event using updatedAt
                    if (b.assignedBy && b.assignedRoom && b.status !== 'Done') {
                        events.push({
                            id: `pb-ra-${b._id}`,
                            timestamp: new Date(
                                (b.status === 'Processing' ? (b.updatedAt || b.createdAt) : b.createdAt) || Date.now()
                            ),
                            type: 'Room Assigned',
                            description: `PM assigned "${b.assignedRoom}" to ${b.cropName || 'batch'} — QC can now begin processing`,
                            impact: `${b.receivedWeightKg ?? '?'} kg in ${b.assignedRoom}`,
                            impactType: 'neutral',
                            actor: b.assignedBy?.name || 'Production Manager',
                            ref: b.assignedRoom,
                        });
                    }

                    // If batch is Done → Stock Recorded event
                    if (b.status === 'Done') {
                        const approved = b.processedWeightKg ?? 0;
                        const rejected = b.rejectedWeightKg ?? 0;
                        events.push({
                            id: `pb-done-${b._id}`,
                            timestamp: new Date(b.updatedAt || b.createdAt || Date.now()),
                            type: 'Stock Confirmed',
                            description: `PM confirmed stock: ${b.cropName || 'Batch'} — ${approved} kg approved${rejected > 0 ? `, ${rejected} kg rejected${b.primaryDefectType && b.primaryDefectType !== 'None' ? ` due to ${b.primaryDefectType}` : ''}` : ''}`,
                            impact: `+${approved} kg stored in ${b.coldRoomName || b.assignedRoom || 'cold room'}`,
                            impactType: rejected > 0 ? 'mixed' : 'positive',
                            actor: b.confirmedBy?.name || b.requestedBy?.name || 'Production Manager',
                            ref: b.stockId || '',
                        });
                    }

                    // If batch is Spoiled → Stock Spoiled event
                    if (b.status === 'Spoiled') {
                        events.push({
                            id: `pb-spoiled-${b._id}`,
                            timestamp: new Date(b.updatedAt || Date.now()),
                            type: 'Stock Spoiled',
                            description: `Stock ${b.stockId || 'item'} marked as spoiled — ${b.processedWeightKg || 0} kg ${b.cropName || 'produce'} written off`,
                            impact: `−${b.processedWeightKg || 0} kg`,
                            impactType: 'negative',
                            actor: b.confirmedBy?.name || 'Production Manager',
                            ref: b.stockId || '',
                        });
                    }
                });
            }

            // 3. Export Batches → "Export Batch Created"
            if (exportRes.status === 'fulfilled') {
                const batches = exportRes.value.data?.data || exportRes.value.data || exportRes.value || [];
                batches.forEach((b: any) => {
                    events.push({
                        id: `eb-${b._id}`,
                        timestamp: new Date(b.createdAt || Date.now()),
                        type: 'Export Batch',
                        description: `Export batch created — ${b.allocatedWeightKg} kg ${b.cropName} for ${b.clientName}, ${b.destination}`,
                        impact: `${b.allocatedWeightKg} kg allocated`,
                        impactType: 'positive',
                        actor: b.createdBy?.full_name || b.createdBy?.role || 'Production Mgr',
                        ref: b.batchId || '',
                    });
                });
            }

            // 4. Shipments → "Flight Departed" + "Cargo Shipped"
            if (shipmentsRes.status === 'fulfilled') {
                const ships = shipmentsRes.value.data?.data || shipmentsRes.value.data || shipmentsRes.value || [];
                ships.forEach((s: any) => {
                    // Flight Departed
                    if (s.departedAt) {
                        events.push({
                            id: `ship-dep-${s._id}`,
                            timestamp: new Date(s.departedAt),
                            type: 'Shipment Departed',
                            description: `Flight ${s.flightNumber} has departed for ${s.destination} with ${s.totalWeightKg?.toLocaleString()} kg cargo`,
                            impact: `${s.totalWeightKg?.toLocaleString()} kg in transit`,
                            impactType: 'neutral',
                            actor: s.createdBy?.name || 'Logistics Officer',
                            ref: s.plNumber || '',
                        });
                    }
                    // Cargo Shipped (Arrived)
                    if (s.shippedAt) {
                        events.push({
                            id: `ship-arr-${s._id}`,
                            timestamp: new Date(s.shippedAt),
                            type: 'Cargo Shipped',
                            description: `Cargo successfully shipped and received at ${s.destination} — Shipment ${s.plNumber}`,
                            impact: `${s.totalWeightKg?.toLocaleString()} kg delivered`,
                            impactType: 'positive',
                            actor: s.createdBy?.name || 'Logistics Officer',
                            ref: s.flightNumber || '',
                        });
                    }
                    // Shipment Cancelled
                    if (s.cancelledAt) {
                        events.push({
                            id: `ship-can-${s._id}`,
                            timestamp: new Date(s.cancelledAt),
                            type: 'Shipment Cancelled',
                            description: `Shipment ${s.plNumber} for Flight ${s.flightNumber} was cancelled. ${s.cancellationReason ? `Reason: ${s.cancellationReason}` : ''}`,
                            impact: `-${s.totalWeightKg?.toLocaleString()} kg allocation reverted`,
                            impactType: 'negative',
                            actor: s.createdBy?.name || 'Logistics Officer',
                            ref: s.plNumber || '',
                        });
                    }
                });
            }

            // Sort newest first
            events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setActivityFeed(events);
        } catch (err) {
            console.error('Failed to build activity feed:', err);
        } finally {
            setActivityLoading(false);
        }
    };

    useEffect(() => {
        // We use refreshStock() etc from context if they are empty
        if (stock.length === 0) refreshStock();
        if (exportBatches.length === 0) refreshExportBatches();
        if (shipments.length === 0) refreshShipments();
        
        fetchActivityFeed();
        // fetchQcDoneBatches(); // No longer needed
    }, []);

    // --- DERIVED / FILTERED DATA ---
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);

    const mappedInventoryItems = inventoryItems.map((item: any) => ({
        ...item,
        farmerSource:   item.cycleId?.farmer_id?.full_name
                        || item.cycleId?.farmer_id?.cooperative_name
                        || item.cycleId?.farm_name
                        || '—',
    }));

    // Filtered Lists

    const filteredActivity = activityFeed.filter(a => {
        // 1. Search Filter
        const searchLower = searchTerm.toLowerCase().trim();
        if (searchLower) {
            const matchesSearch = (a.description?.toLowerCase().includes(searchLower)) ||
                                 (a.type?.toLowerCase().includes(searchLower)) ||
                                 (a.actor?.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }
        
        // 2. Event Type Filter
        if (eventTypeFilter !== 'all') {
            const matchesEvent = a.type?.toLowerCase().trim() === eventTypeFilter.toLowerCase().trim();
            if (!matchesEvent) return false;
        }
        
        // 3. Time Filter
        if (timeRangeFilter !== 'all') {
            const activityDate = new Date(a.timestamp);
            const activityTime = activityDate.getTime();

            if (isNaN(activityTime)) return false;

            if (timeRangeFilter === 'week') {
                if (activityTime < weekAgo.getTime()) return false;
            } else if (timeRangeFilter === 'month') {
                if (activityTime < startOfMonth.getTime()) return false;
            } else if (timeRangeFilter === '3months') {
                if (activityTime < threeMonthsAgo.getTime()) return false;
            }
        }
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const d = new Date(a.timestamp);
            if (!isNaN(d.getTime())) {
                if (d < start || d > end) return false;
            } else {
                return false;
            }
        }

        return true;
    });

    const filteredInventory = mappedInventoryItems.filter((i: any) => {
        const matchesSearch =
            (i.id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (i.produce?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (i.farmerSource?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesProduce = produceFilter === 'all' || i.produce === produceFilter;
        const matchesRoom = roomFilter === 'all' || i.storageLocation === roomFilter;
        const matchesStatus = stockStatusFilter === 'all' || i.status === stockStatusFilter;
        
        let matchesTime = true;
        if (timeRangeFilter !== 'all') {
            const stockDate = new Date(i.dateInStock);
            if (!isNaN(stockDate.getTime())) {
                const stockTime = stockDate.getTime();
                if (timeRangeFilter === 'week') {
                    matchesTime = stockTime >= weekAgo.getTime();
                } else if (timeRangeFilter === 'month') {
                    matchesTime = stockTime >= startOfMonth.getTime();
                } else if (timeRangeFilter === '3months') {
                    matchesTime = stockTime >= threeMonthsAgo.getTime();
                }
            } else {
                matchesTime = false;
            }
        }

        let matchesDateRange = true;
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const d = new Date(i.dateInStock);
            if (!isNaN(d.getTime())) {
                matchesDateRange = d >= start && d <= end;
            } else {
                matchesDateRange = false;
            }
        }

        return matchesSearch && matchesProduce && matchesRoom && matchesStatus && matchesTime && matchesDateRange;
    });

    const filteredExportBatches = exportBatches.filter(b => {
        const matchesSearch =
            (b.batchId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (b.clientName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (b.cropName?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesClient = exportClientFilter === 'all' || b.clientName === exportClientFilter;
        const matchesStatus = exportStatusFilter === 'all' || b.status === exportStatusFilter;

        let matchesTime = true;
        if (timeRangeFilter !== 'all') {
            const batchDate = new Date(b.createdAt);
            if (!isNaN(batchDate.getTime())) {
                const batchTime = batchDate.getTime();
                if (timeRangeFilter === 'week') {
                    matchesTime = batchTime >= weekAgo.getTime();
                } else if (timeRangeFilter === 'month') {
                    matchesTime = batchTime >= startOfMonth.getTime();
                } else if (timeRangeFilter === '3months') {
                    matchesTime = batchTime >= threeMonthsAgo.getTime();
                }
            } else {
                matchesTime = false;
            }
        }

        let matchesDateRange = true;
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const d = new Date(b.createdAt);
            if (!isNaN(d.getTime())) {
                matchesDateRange = d >= start && d <= end;
            } else {
                matchesDateRange = false;
            }
        }

        return matchesSearch && matchesClient && matchesStatus && matchesTime && matchesDateRange;
    });



    // Date Range Helper
    const isWithinDateRange = (dateString: string) => {
        if (!startDate || !endDate || !dateString) return true;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return false;
        return d >= start && d <= end;
    };

    // Stats
    const dateFilteredInventoryItems = inventoryItems.filter((i: any) => isWithinDateRange(i.dateInStock || i.createdAt));
    const totalStockKg = dateFilteredInventoryItems.reduce((sum: number, i: any) => sum + i.availableKg, 0);
    const totalStockTons = (totalStockKg / 1000).toFixed(1);
    
    const dateFilteredStock = stock.filter((i: any) => isWithinDateRange(i.createdAt));
    const intakePeriodKg = dateFilteredStock.reduce((sum, i) => sum + (i.receivedWeightKg || 0), 0);

    const nearlyEmptyCount = dateFilteredInventoryItems.filter((i: any) => 
        i.availableKg > 0 && i.availableKg < i.processedKg * 0.2
    ).length;

    const fullyDepletedCount = dateFilteredInventoryItems.filter((i: any) => 
        i.availableKg === 0 && i.status !== 'Spoiled'
    ).length;
    
    const dateFilteredQcDoneBatches = qcDoneBatches.filter((b: any) => isWithinDateRange(b.createdAt || b.updatedAt));
    const dateFilteredExportBatches = exportBatches.filter((b: any) => isWithinDateRange(b.createdAt));

    const summaryStats = [
        { label: 'Total Stock', value: `${totalStockTons} Tons`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Intake (Period)', value: `${intakePeriodKg.toLocaleString()} kg`, icon: Leaf, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { 
            label: 'Pending Confirmation', 
            value: `${dateFilteredQcDoneBatches.length} Stock`, 
            icon: ClipboardCheck, 
            color: dateFilteredQcDoneBatches.length > 0 ? 'text-amber-600' : 'text-gray-400', 
            bg: dateFilteredQcDoneBatches.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800' 
        },
        { label: 'Active Exports', value: `${dateFilteredExportBatches.filter((b: any) => b.status !== 'Shipped').length} Batches`, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    const getShipmentForBatch = (batchId: string) => {
        return shipments.find(s =>
            s.exportBatches?.some((b: any) =>
                (b._id || b) === batchId
            )
        );
    };

    const formatOrdinalDate = (date: Date) => {
        return formatDate(date);
    };

    // --- EXPORT LOGIC ---

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const makeSheet = (headers: string[], rows: any[][]) => {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            ws['!cols'] = headers.map((h, i) => ({
                wch: Math.min(Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 4, 40)
            }));
            return ws;
        };

        if (activeTab === 'recent_activity') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Time', 'Event', 'Description', 'Impact', 'Performed By'],
                filteredActivity.map(a => [
                    formatDateTime(a.timestamp),
                    a.type, a.description, a.impact, a.actor
                ])
            ), 'Recent_Activity');
        } else if (activeTab === 'active_inventory') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Stock ID', 'Produce', 'Farmer / Source', 'Grade', 'Processed (kg)', 'Rejected (kg)', 'Defect Type', 'Allocated (kg)', 'Available (kg)', 'Storage', 'Date In Stock', 'Status'],
                filteredInventory.map((i: any) => [
                    i.id, 
                    i.produce, 
                    i.farmerSource || '—',
                    i.grade || '—',
                    i.processedKg, 
                    i.rejectedKg || 0,
                    i.primaryDefectType && i.primaryDefectType !== 'None' ? i.primaryDefectType : '—',
                    i.totalAllocated || 0,
                    i.availableKg || 0,
                    i.storageLocation || '—', 
                    formatDate(i.dateInStock),
                    i.status
                ])
            ), 'Inventory_Stock');
        } else if (activeTab === 'export_batches') {
            XLSX.utils.book_append_sheet(wb, makeSheet(
                ['Batch ID', 'Produce', 'Client', 'Destination', 'Weight (kg)', 'Status', 'Departure'],
                filteredExportBatches.map(b => [b.batchId, b.cropName, b.clientName, b.destination, b.allocatedWeightKg, b.status, formatDate(b.departureDate)])
            ), 'Export_Batches');
        }

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Sarura_Inventory_${activeTab}_${dateStr}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = () => {
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
        const title = activeTab.replace('_', ' ').toUpperCase();
        doc.text(`${title} AUDIT REPORT`, 15, 42);

        // ── 3. Summary Section ──
        const summaryFields = [
            { label: 'Current Inventory', value: `${totalStockTons} Tons` },
            { label: 'Recent Intake',    value: `${intakePeriodKg.toLocaleString()} kg` },
            { label: 'Active Exports',   value: `${dateFilteredExportBatches.filter((b: any) => b.status !== 'Shipped').length} Batches` },
            { label: 'System Alert Count', value: String(fullyDepletedCount + nearlyEmptyCount) },
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

        // ── 4. Data Table ──
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        if (activeTab === 'recent_activity') {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['TIME', 'EVENT', 'DESCRIPTION', 'IMPACT', 'USER']],
                body: filteredActivity.map(a => [
                    formatDateTime(a.timestamp),
                    a.type, a.description, a.impact, a.actor
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });
        } else if (activeTab === 'active_inventory') {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['ID', 'PRODUCE', 'SOURCE', 'GRADE', 'PROC.', 'REJ.', 'ALLOC.', 'AVAIL.', 'LOCATION', 'DATE', 'STATUS']],
                body: filteredInventory.map(i => [
                    i.id, 
                    i.produce, 
                    i.farmerSource || '—',
                    i.grade || '—', 
                    `${i.processedKg.toLocaleString()} kg`, 
                    i.rejectedKg > 0 ? `${i.rejectedKg.toLocaleString()} kg${i.primaryDefectType && i.primaryDefectType !== 'None' ? `\n(${i.primaryDefectType})` : ''}` : '—', 
                    `${i.totalAllocated || 0} kg`,
                    `${i.availableKg || 0} kg`,
                    i.storageLocation || '—', 
                    formatDate(i.dateInStock),
                    i.status
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });
        } else if (activeTab === 'export_batches') {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['BATCH ID', 'PRODUCE', 'CLIENT', 'DESTINATION', 'WEIGHT (KG)', 'STATUS']],
                body: filteredExportBatches.map(b => [b.batchId, b.cropName, b.clientName, b.destination, b.allocatedWeightKg.toLocaleString(), b.status]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 }
            });
        }

        // ── 5. System Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 210) { doc.addPage(); lastY = 20; }
        
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        
        const depletionMsg = fullyDepletedCount > 0 ? `${fullyDepletedCount} items fully depleted.` : 'No critical stock depletion detected.';
        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        doc.text(`• Inventory Health: ${depletionMsg} Current total availability is ${totalStockTons} Tons.`, 15, lastY + 23);
        doc.text(`• Logistics Throughput: ${exportBatches.filter(b => b.status === 'ReadyForExport').length} batches are ready for immediate export dispatch.`, 15, lastY + 29);
        doc.text(`• Recent Activity: ${activityFeed.length} significant inventory events logged in the current reporting period.`, 15, lastY + 35);

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

        doc.save(`Sarura_Inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    return (
        <div className="p-6 space-y-6 pb-20">

            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory & Batch Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track intake, stock, and export allocation.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                        {/* Date Range */}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
                            <Calendar size={15} className="text-green-500 flex-shrink-0" />
                            <span className="text-xs text-gray-400 font-medium">From:</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer w-[120px]" />
                            <span className="text-xs text-gray-400 font-medium">To:</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer w-[120px]" />
                            
                            <button
                                onClick={() => {
                                    const d = new Date(); d.setMonth(d.getMonth() - 3);
                                    setStartDate(d.toISOString().split('T')[0]);
                                    setEndDate(new Date().toISOString().split('T')[0]);
                                }}
                                className="ml-1 text-xs text-green-600 hover:text-green-700 font-bold transition-colors whitespace-nowrap"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
                            >
                                <Download size={15} />
                                Export Data
                                
                            </button>

                            
                        </div>

                        <button
                            onClick={() => setIsExportBatchOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm font-bold text-sm"
                        >
                            <Plus size={16} />
                            Create Export Batch
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Stock — custom card with alert */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border hover:shadow-md transition-all relative overflow-hidden ${
                    fullyDepletedCount > 0
                        ? 'border-red-200 dark:border-red-800/40'
                        : nearlyEmptyCount > 0
                        ? 'border-amber-200 dark:border-amber-800/40'
                        : 'border-gray-100 dark:border-gray-700'
                }`}>
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Stock</p>
                            <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                                {totalStockTons} Tons
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">Available only</p>

                            {/* Alert line */}
                            {fullyDepletedCount > 0 && (
                                <p className="text-xs text-red-500 font-semibold mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                    {fullyDepletedCount} item{fullyDepletedCount > 1 ? 's' : ''} fully depleted
                                </p>
                            )}
                            {nearlyEmptyCount > 0 && (
                                <p className="text-xs text-amber-500 font-semibold mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                    {nearlyEmptyCount} item{nearlyEmptyCount > 1 ? 's' : ''} nearly empty
                                </p>
                            )}
                        </div>
                        <div className={`p-3 rounded-lg flex-shrink-0 ${
                            fullyDepletedCount > 0
                                ? 'bg-red-50 dark:bg-red-900/20'
                                : nearlyEmptyCount > 0
                                ? 'bg-amber-50 dark:bg-amber-900/20'
                                : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}>
                            <Package className={
                                fullyDepletedCount > 0
                                    ? 'text-red-500'
                                    : nearlyEmptyCount > 0
                                    ? 'text-amber-500'
                                    : 'text-blue-600'
                            } size={24} />
                        </div>
                    </div>
                </div>

                {/* Remaining 3 cards unchanged */}
                {summaryStats.slice(1).map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-2">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                                    {stat.value}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg flex-shrink-0 ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {packagingAlert && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${
                    packagingAlert === 'empty' || packagingAlert === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800/40 dark:text-red-400'
                        : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800/40 dark:text-amber-400'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <span className={`relative flex h-2 w-2`}>
                            {(packagingAlert === 'empty' || packagingAlert === 'critical') && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                packagingAlert === 'low' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                        </span>
                        <span>
                            {packagingAlert === 'empty'
                                ? 'Packaging stock is empty — export batch creation is blocked until boxes are restocked.'
                                : packagingAlert === 'critical'
                                ? 'Packaging stock is critically low — reorder immediately to avoid blocking shipments.'
                                : 'Packaging stock is running low — consider restocking soon.'}
                        </span>
                    </div>
                    <button
                        onClick={() => setActiveTab('packaging')}
                        className="text-xs font-bold underline underline-offset-2 ml-4 whitespace-nowrap"
                    >
                        Go to Packaging →
                    </button>
                </div>
            )}

            {/* Main Content Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">

                {/* Table Header & Controls */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between p-4">

                        {/* 3-Lifecycle Tabs */}
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('recent_activity')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'recent_activity'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Recent Activity
                            </button>
                            <button
                                onClick={() => setActiveTab('active_inventory')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'active_inventory'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Inventory (Stock)
                            </button>
                            <button
                                onClick={() => setActiveTab('export_batches')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'export_batches'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Export Batches
                            </button>
                            <button
                                onClick={() => setActiveTab('packaging')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'packaging'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                Packaging
                            </button>
                        </div>
                    </div>
                </div>

                {/* Unified Search & Filter Bar (below tabs) */}
                {activeTab !== 'packaging' && (
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'recent_activity' ? "Search activities..." : "Search..."}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setActivityPage(1);
                                setInventoryPage(1);
                                setExportPage(1);
                            }}
                            className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition-all"
                        />
                    </div>

                    {activeTab === 'recent_activity' && (
                        <>
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={eventTypeFilter}
                                    onChange={(e) => { setEventTypeFilter(e.target.value); setActivityPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Events</option>
                                    <option value="Harvest Declared">Harvest Declared</option>
                                    <option value="Pickup Logged">Pickup Logged</option>
                                    <option value="Room Requested">Room Requested</option>
                                    <option value="Room Assigned">Room Assigned</option>
                                    <option value="Stock Recorded">Stock Recorded</option>
                                    <option value="Export Batch">Export Batch</option>
                                    <option value="Shipment Departed">Shipment Departed</option>
                                    <option value="Cargo Shipped">Cargo Shipped</option>
                                    <option value="Shipment Cancelled">Shipment Cancelled</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>
                            <div className="relative">
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={timeRangeFilter}
                                    onChange={(e) => { setTimeRangeFilter(e.target.value); setActivityPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="3months">Last 3 Months</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>
                        </>
                    )}

                    {activeTab === 'active_inventory' && (
                        <>
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={produceFilter}
                                    onChange={(e) => { setProduceFilter(e.target.value); setInventoryPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Produce</option>
                                    {[...new Set(inventoryItems.map(i => i.produce))].map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={roomFilter}
                                    onChange={(e) => { setRoomFilter(e.target.value); setInventoryPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Rooms</option>
                                    {[...new Set(inventoryItems.map((i: any) => i.storageLocation).filter(Boolean))].map(name => (
                                        <option key={name as string} value={name as string}>{name as string}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={stockStatusFilter}
                                    onChange={(e) => { setStockStatusFilter(e.target.value); setInventoryPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="Available">Available</option>
                                    <option value="Partially Allocated">Partially Allocated</option>
                                    <option value="Fully Allocated">Fully Allocated</option>
                                    <option value="Spoiled">Spoiled</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={timeRangeFilter}
                                    onChange={(e) => { setTimeRangeFilter(e.target.value); setInventoryPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="3months">Last 3 Months</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>
                        </>
                    )}
                    {activeTab === 'export_batches' && (
                        <>
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={exportClientFilter}
                                    onChange={(e) => { setExportClientFilter(e.target.value); setExportPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Clients</option>
                                    {[...new Set(exportBatches.map(b => b.clientName))].filter(Boolean).map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={exportStatusFilter}
                                    onChange={(e) => { setExportStatusFilter(e.target.value); setExportPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="ReadyForExport">Ready for Export</option>
                                    <option value="Shipped">Shipped</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>

                            <div className="relative">
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={timeRangeFilter}
                                    onChange={(e) => { setTimeRangeFilter(e.target.value); setExportPage(1); }}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="3months">Last 3 Months</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                            </div>
                        </>
                    )}

                    {(searchTerm || eventTypeFilter !== 'all' || timeRangeFilter !== 'all' || produceFilter !== 'all' || roomFilter !== 'all' || stockStatusFilter !== 'all' || exportClientFilter !== 'all' || exportStatusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setEventTypeFilter('all');
                                setTimeRangeFilter('all');
                                setProduceFilter('all');
                                setRoomFilter('all');
                                setStockStatusFilter('all');
                                setExportClientFilter('all');
                                setExportStatusFilter('all');
                                const d = new Date(); d.setMonth(d.getMonth() - 3);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                                setActivityPage(1);
                                setInventoryPage(1);
                                setExportPage(1);
                            }}
                            className="text-xs text-green-600 hover:text-green-700 font-bold transition-colors px-2 whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            )}


                {/* --- TAB 2: INVENTORY VIEW --- */}
                {activeTab === 'active_inventory' && (
                    <div className="flex flex-col">

                        {/* QCDone Queue — PM must confirm before stock appears */}
                        {dateFilteredQcDoneBatches.length > 0 && (
                            <div className="p-4 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/20">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                                    Awaiting Your Confirmation
                                    <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {dateFilteredQcDoneBatches.length}
                                    </span>
                                </h3>

                                <div className="flex flex-col gap-3">
                                    {dateFilteredQcDoneBatches.map((batch: any) => (
                                        <div key={batch._id} className="bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-amber-800/30 shadow-sm overflow-hidden">
                                            
                                            {/* Batch summary row */}
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {batch.cropName}
                                                        <span className="ml-2 text-xs font-normal text-gray-400">
                                                            {batch.assignedRoom || 'No room assigned'}
                                                        </span>
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                            ✓ {batch.processedWeightKg} kg approved
                                                        </span>
                                                        <span className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
                                                            ✗ {batch.rejectedWeightKg} kg rejected
                                                            {batch.primaryDefectType && batch.primaryDefectType !== 'None' && (
                                                                <span className="ml-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                                    ({batch.primaryDefectType})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            QC by {batch.requestedBy?.name || 'QC Officer'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setSelectedBatchForConfirm(batch);
                                                        setIsAssignStockRoomModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                                >
                                                    Review & Confirm
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        <th className="px-6 py-4">Stock ID</th>
                                        <th className="px-6 py-4">Produce</th>
                                        <th className="px-6 py-4">Farmer / Source</th>
                                        <th className="px-6 py-4">Grade</th>
                                        <th className="px-6 py-4">Processed</th>
                                        <th className="px-6 py-4">Rejected</th>
                                        <th className="px-6 py-4">Allocated</th>
                                        <th className="px-6 py-4">Available</th>
                                        <th className="px-6 py-4">Location</th>
                                        <th className="px-6 py-4">Date In Stock</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredInventory
                                        .slice((inventoryPage - 1) * itemsPerPage, inventoryPage * itemsPerPage)
                                        .map((item) => {
                                            const statusConfig: Record<string, string> = {
                                                'Available':           'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                'Partially Allocated': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                                                'Fully Allocated':     'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                                                'Spoiled':             'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                                            };

                                            return (
                                                <tr key={item.rawId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    
                                                    {/* Stock ID */}
                                                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                                        {item.id}
                                                    </td>

                                                    {/* Produce */}
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                        {item.produce}
                                                    </td>

                                                    {/* Farmer / Source */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {item.farmerSource}
                                                    </td>

                                                    {/* Grade */}
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {item.grade || '—'}
                                                    </td>

                                                    {/* Processed */}
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                        {item.processedKg.toLocaleString()} kg
                                                    </td>

                                                    {/* Rejected */}
                                                    <td className="px-6 py-4 text-sm">
                                                        {item.rejectedKg > 0 ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-red-500 dark:text-red-400 font-medium">
                                                                    -{item.rejectedKg.toLocaleString()} kg
                                                                </span>
                                                                {item.primaryDefectType && item.primaryDefectType !== 'None' && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                        {item.primaryDefectType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Allocated (reserved in export batches) */}
                                                    <td className="px-6 py-4 text-sm font-medium text-purple-600 dark:text-purple-400">
                                                        {item.totalAllocated > 0
                                                            ? `${item.totalAllocated.toLocaleString()} kg`
                                                            : <span className="text-gray-400">—</span>
                                                        }
                                                    </td>

                                                    {/* Available (what's left) */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`text-sm font-bold ${
                                                                item.availableKg === 0
                                                                    ? 'text-gray-400'
                                                                    : item.availableKg < item.processedKg * 0.2
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : item.availableKg < item.processedKg * 0.5
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                                {item.availableKg.toLocaleString()} kg
                                                            </span>

                                                            {/* Progress bar */}
                                                            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${
                                                                        item.availableKg === 0
                                                                            ? 'bg-gray-300'
                                                                            : item.availableKg < item.processedKg * 0.2
                                                                            ? 'bg-red-500'
                                                                            : item.availableKg < item.processedKg * 0.5
                                                                            ? 'bg-amber-400'
                                                                            : 'bg-green-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min((item.availableKg / item.processedKg) * 100, 100)}%` }}
                                                                />
                                                            </div>

                                                            {/* Alert label */}
                                                            {item.availableKg > 0 && item.availableKg < item.processedKg * 0.2 && (
                                                                <span className="text-[10px] text-red-500 font-semibold">Nearly empty</span>
                                                            )}
                                                            {item.availableKg === 0 && item.status !== 'Fully Allocated' && (
                                                                <span className="text-[10px] text-gray-400">All allocated</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Location */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {item.storageLocation}
                                                    </td>

                                                    {/* Date In Stock */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        <div className="flex flex-col">
                                                            <span>{formatDate(item.dateInStock)}</span>
                                                            <span className="text-xs text-gray-400 mt-0.5">
                                                                {Math.floor((Date.now() - item.dateInStock.getTime()) / (1000 * 60 * 60 * 24))} days ago
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[item.status] || statusConfig['Available']}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="relative inline-block text-left">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(openMenuId === item.rawId ? null : item.rawId);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>
                                                            {openMenuId === item.rawId && (
                                                                <>
                                                                    {/* Invisible overlay for click-outside to close */}
                                                                    <div 
                                                                        className="fixed inset-0 z-40 bg-transparent" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenMenuId(null);
                                                                        }} 
                                                                    />
                                                                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden text-left">
                                                                        <div className="p-1 flex flex-col gap-0.5">
                                                                            <button
                                                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg font-medium transition-colors"
                                                                                onClick={() => {
                                                                                    setSelectedStockItem(item);
                                                                                    setIsStockDetailOpen(true);
                                                                                    setOpenMenuId(null);
                                                                                }}
                                                                            >
                                                                                View Details
                                                                            </button>
                                                                            <div className="mx-2 border-t border-gray-100 dark:border-gray-700" />
                                                                            <button
                                                                                disabled={item.status === 'Fully Allocated' || item.status === 'Spoiled'}
                                                                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                                onClick={() => {
                                                                                    setSelectedStockItem(item);
                                                                                    setIsStockDetailOpen(true);
                                                                                    setOpenMenuId(null);
                                                                                }}
                                                                            >
                                                                                Mark as Spoiled
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                    {filteredInventory.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-16 text-center text-sm text-gray-400">
                                                No stock items found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <Pagination
                                currentPage={inventoryPage}
                                totalItems={filteredInventory.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setInventoryPage}
                            />
                        </div>
                    </div>
                )}

                {/* --- TAB 3: EXPORT BATCHES VIEW --- */}
                {activeTab === 'export_batches' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <th className="px-6 py-4">Batch ID</th>
                                    <th className="px-6 py-4">Client / Destination</th>
                                    <th className="px-6 py-4">Composition</th>
                                    <th className="px-6 py-4">Shipment Date</th>
                                    <th className="px-6 py-4">PL Number</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredExportBatches.slice((exportPage - 1) * itemsPerPage, exportPage * itemsPerPage).map((item) => {
                                    const shipment = getShipmentForBatch(item._id);
                                    return (
                                        <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{item.batchId}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{item.clientName}</span>
                                                    <span className="text-xs text-gray-500">{item.destination}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {item.cropName} — {item.boxCount} {item.boxCount === 1 ? 'box' : 'boxes'} ({item.allocatedWeightKg?.toLocaleString()} kg)
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {(() => {
                                                    const confirmedDate = shipment?.departureDate;
                                                    const plannedDate = item.targetShipmentDate;

                                                    if (confirmedDate) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                    {formatDate(confirmedDate)}
                                                                </span>
                                                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5">
                                                                    Confirmed flight
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    if (plannedDate) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-600 dark:text-gray-300">
                                                                    {formatDate(plannedDate)}
                                                                </span>
                                                                <span className="text-[10px] text-amber-500 font-medium mt-0.5">
                                                                    Target — not yet booked
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    return <span className="text-gray-400">—</span>;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {!shipment ? (
                                                    <span className="text-xs text-gray-400">Awaiting shipment</span>
                                                ) : (
                                                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        {shipment.plNumber}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    item.status === 'ReadyForExport' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                    (item.status === 'Shipped' && (shipment?.status === 'PackingListGenerated' || shipment?.status === 'Draft')) ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                    (item.status === 'Shipped' && shipment?.status === 'Departed') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                    item.status === 'Shipped' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                    'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                }`}>
                                                    {item.status === 'ReadyForExport' ? 'Ready for Export' :
                                                     (item.status === 'Shipped' && (shipment?.status === 'PackingListGenerated' || shipment?.status === 'Draft')) ? 'Scheduled' :
                                                     (item.status === 'Shipped' && shipment?.status === 'Departed') ? 'In Transit' :
                                                     item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedBatch(item); setIsBatchModalOpen(true); }}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                        item.status === 'Pending'
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                                                            : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                                                    }`}
                                                >
                                                    {item.status === 'Pending' ? 'Mark Ready' : 'View Details'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination currentPage={exportPage} totalItems={filteredExportBatches.length} itemsPerPage={itemsPerPage} onPageChange={setExportPage} />
                    </div>
                )}

                {activeTab === 'recent_activity' && (
                    <div className="flex flex-col">


                        {activityLoading ? (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                                <div className="w-4 h-4 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                                Loading activity feed...
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            <th className="px-6 py-4 w-32">Time</th>
                                            <th className="px-6 py-4 w-40">Event</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 w-36">Impact</th>
                                            <th className="px-6 py-4 w-36">Performed By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredActivity
                                            .slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage)
                                            .map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900 dark:text-white">{formatOrdinalDate(item.timestamp)}</span>
                                                            <span className="text-[10px] text-gray-400 mt-0.5">{item.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                            item.type === 'Harvest Declared'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                            item.type === 'Pickup Logged'     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            item.type === 'Room Requested'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                            item.type === 'Room Assigned'     ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' :
                                                            item.type === 'QC In Progress'    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' :
                                                            item.type === 'Stock Recorded'    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                                                            item.type === 'Export Batch'      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                            item.type === 'Shipment Departed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                                            item.type === 'Cargo Shipped'     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                                            item.type === 'Shipment Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                                        }`}>
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                                                        {item.ref && (
                                                            <p className="text-xs font-mono text-gray-400 mt-0.5">{item.ref}</p>
                                                        )}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm font-medium ${
                                                        item.impactType === 'positive' ? 'text-green-600 dark:text-green-400' :
                                                        item.impactType === 'negative' ? 'text-red-500 dark:text-red-400' :
                                                        'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                        {item.impactType === 'mixed' ? (
                                                            // Split "+480 kg / −20 kg" into two colored spans
                                                            item.impact.split('/').map((part: string, i: number) => (
                                                                <span key={i} className={`block ${
                                                                    part.trim().startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                                                                }`}>{part.trim()}</span>
                                                            ))
                                                        ) : item.impact}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {item.actor}
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                        {filteredActivity.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                                                    No production activity recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={activityPage}
                                    totalItems={filteredActivity.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setActivityPage}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'packaging' && (
                    <div className="p-6">
                        <PackagingStockPage />
                    </div>
                )}
            </div>


            {/* --- DRAWERS --- */}

            {/* Modal 3: Create Export Batch */}
            <CreateExportBatchModal
                isOpen={isExportBatchOpen}
                onClose={() => setIsExportBatchOpen(false)}
                inventoryItems={inventoryItems}
                onSuccess={() => {
                    setIsExportBatchOpen(false);
                    refreshExportBatches();
                    refreshStock(); // refresh available weights
                    setActiveTab('export_batches');
                }}
            />

            {/* Modal 4: Manage Batch Detail */}
            <BatchDetailModal
                isOpen={isBatchModalOpen}
                onClose={() => {
                    setIsBatchModalOpen(false);
                    setTimeout(() => setSelectedBatch(null), 200);
                }}
                batch={selectedBatch}
                onStatusChange={() => { refreshExportBatches(); }}
            />

            {/* Modal 5: Stock Item Detail & Mark Spoiled */}
            <StockDetailModal
                isOpen={isStockDetailOpen}
                onClose={() => {
                    setIsStockDetailOpen(false);
                    setTimeout(() => setSelectedStockItem(null), 200);
                }}
                stockItem={selectedStockItem}
                onMarkedSpoiled={() => {
                    refreshStock();
                    fetchActivityFeed();
                }}
            />



            <AssignRoomModal
                isOpen={isAssignStockRoomModalOpen}
                onClose={() => {
                    setIsAssignStockRoomModalOpen(false);
                    setSelectedBatchForConfirm(null);
                }}
                batch={selectedBatchForConfirm}
                mode="confirm"
                onSuccess={() => {
                    showToast("Stock Confirmed", "Batch has been successfully moved to active inventory");
                    refreshStock();
                    refreshProcessingBatches();
                    fetchActivityFeed();
                }}
            />
        </div>
    );
};

export default InventoryManagement;
