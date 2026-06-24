import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Truck, Wrench, Search, Filter, Plus, Calendar, Phone, Eye, Loader2, Download, FileSpreadsheet, FileText, ChevronDown, CheckCircle2, ClipboardList, Trash2, AlertTriangle } from 'lucide-react';
import AddVehicleModal from '../components/AddVehicleModal';
import LogMaintenanceModal from '../components/LogMaintenanceModal';
import ServiceHistoryModal from '../components/ServiceHistoryModal';
import AddDriverModal from '../components/AddDriverModal';
import AssignTruckModal from '../components/AssignTruckModal';
import Pagination from '../../shared/component/Pagination';
import { api } from '../../../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '../../../assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

const Fleet = () => {
    const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterLicense, setFilterLicense] = useState('All');
    const [vehiclePage, setVehiclePage] = useState(1);
    const [driverPage, setDriverPage] = useState(1);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const itemsPerPage = 10; // Increased from mock 3

    const [vehicles, setVehicles] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
    const [selectedVehicleForMaintenance, setSelectedVehicleForMaintenance] = useState<{ id: string, plate: string } | null>(null);

    const handleOpenMaintenance = (vehicle: any) => {
        setSelectedVehicleForMaintenance({ id: vehicle._id, plate: vehicle.plateNumber });
        setIsMaintenanceOpen(true);
    };

    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [isAssignTruckOpen, setIsAssignTruckOpen] = useState(false);
    const [selectedDriverForAssignment, setSelectedDriverForAssignment] = useState<any>(null);

    const handleOpenAssignTruck = (driver: any) => {
        setSelectedDriverForAssignment(driver);
        setIsAssignTruckOpen(true);
    };

    const [serviceLogVehicle, setServiceLogVehicle] = useState<any | null>(null);
    const [serviceLogs, setServiceLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, type: 'vehicle' | 'driver' } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const endpoint = deleteTarget.type === 'vehicle' ? `/fleet/vehicles/${deleteTarget.id}` : `/fleet/drivers/${deleteTarget.id}`;
            await api.delete(endpoint);
            await fetchData(); // Ensure data is refreshed
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchServiceLogs = async (vehicle: any) => {
        setServiceLogVehicle(vehicle);
        setIsHistoryOpen(true);
        setLoadingLogs(true);
        try {
            const res = await api.get(`/fleet/vehicles/${vehicle._id}/service-logs`);
            setServiceLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch service logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehiclesRes, driversRes] = await Promise.all([
                api.get('/fleet/vehicles'),
                api.get('/fleet/drivers')
            ]);
            setVehicles(vehiclesRes.data || []);
            setDrivers(driversRes.data || []);
        } catch (error) {
            console.error('Error fetching fleet data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExportXLSX = () => {
        const dataToExport = activeTab === 'vehicles' ? filteredVehicles : filteredDrivers;
        const sheetData = activeTab === 'vehicles' 
            ? dataToExport.map(v => ({
                'Plate Number': v.plateNumber,
                'Type': v.type,
                'Capacity (kg)': v.capacityKg,
                'Next Maintenance': v.nextMaintenanceDate ? new Date(v.nextMaintenanceDate).toLocaleDateString() : 'N/A',
                'Status': v.status
            }))
            : dataToExport.map(d => ({
                'Name': `${d.firstName} ${d.lastName}`,
                'Phone': d.phoneNumber,
                'License': d.licenseType,
                'Vehicle': d.assignedVehicle?.plateNumber || 'Unassigned',
                'Status': d.status
            }));

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'vehicles' ? 'Vehicles' : 'Drivers');
        XLSX.writeFile(wb, `FreshSarura_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const toTitleCase = (str: string) =>
            str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
        doc.text(`${activeTab.toUpperCase()} STATUS REPORT`, 15, 42);

        // 3. Summary Fields
        const summaryFields = activeTab === 'vehicles' ? [
            { label: 'Total Fleet', value: String(vehicles.length) },
            { label: 'In Maintenance', value: String(vehicles.filter(v => v.status === 'Maintenance').length) },
            { label: 'Available Units', value: String(vehicles.filter(v => v.status === 'Available').length) },
            { label: 'Total Capacity', value: `${vehicles.reduce((s, v) => s + (v.capacityKg || 0), 0).toLocaleString()} kg` },
        ] : [
            { label: 'Total Drivers', value: String(drivers.length) },
            { label: 'On Active Duty', value: String(drivers.filter(d => d.status === 'Driving').length) },
            { label: 'Off Duty', value: String(drivers.filter(d => d.status === 'Off Duty').length) },
            { label: 'Licensed Personnel', value: String(drivers.filter(d => d.licenseType).length) },
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

        if (activeTab === 'vehicles') {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['PLATE', 'TYPE', 'CAPACITY', 'NEXT SERVICE', 'STATUS']],
                body: filteredVehicles.map(v => [
                    v.plateNumber,
                    toTitleCase(v.type),
                    `${(v.capacityKg || 0).toLocaleString()} kg`,
                    v.nextMaintenanceDate ? new Date(v.nextMaintenanceDate).toLocaleDateString('en-GB') : '—',
                    v.status
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'available') data.cell.styles.textColor = '#16a34a';
                        else if (s === 'in maintenance') data.cell.styles.textColor = '#dc2626';
                        else if (s === 'on trip') data.cell.styles.textColor = '#ea580c';
                        else data.cell.styles.textColor = '#6b7280';
                    }
                }
            });
        } else {
            autoTable(doc, {
                startY: yPos + 10,
                head: [['NAME', 'PHONE', 'LICENSE', 'VEHICLE', 'STATUS']],
                body: filteredDrivers.map(d => [
                    toTitleCase(`${d.firstName} ${d.lastName}`),
                    d.phoneNumber,
                    d.licenseType,
                    d.assignedVehicle?.plateNumber || '—',
                    d.status
                ]),
                theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
                margin: { left: 15, right: 15, bottom: 30 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        const s = String(data.cell.raw).toLowerCase();
                        if (s === 'driving') data.cell.styles.textColor = '#16a34a';
                        else if (s === 'idle') data.cell.styles.textColor = '#2563eb';
                    }
                }
            });
        }

        // 5. System Insights
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 210) { doc.addPage(); lastY = 20; }
        
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        
        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        if (activeTab === 'vehicles') {
            const maintenance = vehicles.filter(v => v.status === 'Maintenance').length;
            const avgCapacity = vehicles.length ? (vehicles.reduce((s, v) => s + (v.capacityKg || 0), 0) / vehicles.length).toFixed(0) : '0';
            doc.text(`• Maintenance Rate: ${((maintenance / (vehicles.length || 1)) * 100).toFixed(1)}% of the fleet is currently in service.`, 15, lastY + 23);
            doc.text(`• Average Capacity: The average vehicle payload capacity is ${avgCapacity} kg.`, 15, lastY + 29);
        } else {
            const active = drivers.filter(d => d.status === 'Driving').length;
            doc.text(`• Workforce Utilization: ${((active / (drivers.length || 1)) * 100).toFixed(1)}% of drivers are currently assigned to active trips.`, 15, lastY + 23);
            doc.text(`• Resource Readiness: ${drivers.filter(d => d.status === 'Idle').length} drivers are available for immediate dispatch.`, 15, lastY + 29);
        }

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

        doc.save(`FreshSarura_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    // Filter Data
    const filteredVehicles = (vehicles || []).filter(v => {
        const matchesSearch = (v?.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (v?.type || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
        const matchesType = filterType === 'All' || v.type === filterType;
        return matchesSearch && matchesStatus && matchesType;
    });

    const filteredDrivers = (drivers || []).filter(d => {
        const name = `${d?.firstName || ''} ${d?.lastName || ''}`;
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
        const matchesLicense = filterLicense === 'All' || d.licenseType === filterLicense;
        return matchesSearch && matchesStatus && matchesLicense;
    });

    // Available Vehicles for Assignment (Excluding Maintenance/On Trip)
    const availableVehiclesForAssignment = (vehicles || []).filter(v => v.status === 'Available');

    // Stats Calculations
    const vehicleStats = {
        total: (vehicles || []).length,
        active: (vehicles || []).filter(v => v.status === 'Available' || v.status === 'On Trip').length,
        maintenance: (vehicles || []).filter(v => v.status === 'Maintenance').length
    };

    const driverStats = {
        total: (drivers || []).length,
        onShift: (drivers || []).filter(d => d.status === 'Driving' || d.status === 'Idle').length,
        offDuty: (drivers || []).filter(d => d.status === 'Off Duty').length
    };

    const maintenanceAlerts = (vehicles || []).filter(v => {
        if (v.status === 'Maintenance') return true;
        if (!v.nextMaintenanceDate) return false;
        const nextDate = new Date(v.nextMaintenanceDate);
        const now = new Date();
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 7; // Alert if less than 7 days
    }).length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Idle': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'On Trip': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Driving': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Maintenance': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'Off Duty': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-6 space-y-6 pb-20 relative animate-fade-in">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fleet & Drivers</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage vehicle assets, driver profiles, and assignments.</p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                    {loading && (
                        <div className="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
                            <Loader2 className="animate-spin" size={18} />
                            Syncing...
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            <Download size={18} className="text-indigo-600" />
                            Export Data
                            <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                <button
                                    onClick={handleExportXLSX}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700"
                                >
                                    <FileSpreadsheet size={18} className="text-emerald-600" />
                                    Export as Excel
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FileText size={18} className="text-red-600" />
                                    Export as PDF
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (activeTab === 'vehicles') setIsAddVehicleOpen(true);
                            if (activeTab === 'drivers') setIsAddDriverOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}
                    </button>
                </div>
            </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Vehicles', value: vehicleStats.total, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', sub: `${vehicleStats.active} Active • ${vehicleStats.maintenance} Maintenance` },
                    { label: 'Total Drivers', value: driverStats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', sub: `${driverStats.onShift} Active` },
                    { label: 'Maintenance Alerts', value: `${maintenanceAlerts} Alert${maintenanceAlerts !== 1 ? 's' : ''}`, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', sub: 'Due or in service' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                                    {stat.value}
                                </div>
                                <p className={`text-xs mt-1 font-medium ${stat.color === 'text-amber-600' ? 'text-amber-600' : stat.color === 'text-blue-600' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                    {stat.sub}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Workspace */}
            {/* Main Content Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">

                {/* Unified Header with Tabs and Search */}
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                        {/* Tabs */}
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => { setActiveTab('vehicles'); setFilterStatus('All'); setFilterType('All'); setFilterLicense('All'); setVehiclePage(1); }}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'vehicles'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Truck size={16} /> Vehicles
                            </button>
                            <button
                                onClick={() => { setActiveTab('drivers'); setFilterStatus('All'); setFilterType('All'); setFilterLicense('All'); setDriverPage(1); }}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'drivers'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Users size={16} /> Drivers
                            </button>
                        </div>

                        {/* Search in the same row if possible */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'vehicles' ? 'by plate or type...' : 'by name...'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="p-4 pt-0 flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="All">All Statuses</option>
                                {activeTab === 'vehicles' ? (
                                    <>
                                        <option value="Available">Available</option>
                                        <option value="On Trip">On Trip</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Idle">Idle</option>
                                        <option value="Driving">Driving</option>
                                        <option value="Off Duty">Off Duty</option>
                                    </>
                                )}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        </div>

                        {activeTab === 'vehicles' ? (
                            <div className="relative">
                                <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="All">All Types</option>
                                    <option value="Refrigerated Truck">Refrigerated Truck</option>
                                    <option value="Standard Truck">Standard Truck</option>
                                    <option value="Pickup">Pickup</option>
                                    <option value="Van">Van</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <select
                                    value={filterLicense}
                                    onChange={(e) => setFilterLicense(e.target.value)}
                                    className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer shadow-sm"
                                >
                                    <option value="All">All Licenses</option>
                                    <option value="A">Category A</option>
                                    <option value="B">Category B</option>
                                    <option value="C">Category C</option>
                                    <option value="D">Category D</option>
                                    <option value="E">Category E</option>
                                    <option value="F">Category F</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}
                    </div>
                </div>



                <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase tracking-wider text-xs">
                                <tr>
                                    {activeTab === 'vehicles' ? (
                                        <>
                                            <th className="px-6 py-4 font-semibold">Plate Number</th>
                                            <th className="px-6 py-4 font-semibold">Type & Capacity</th>
                                            <th className="px-6 py-4 font-semibold">Current Driver</th>
                                            <th className="px-6 py-4 font-semibold">Next Service</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 font-semibold">Name</th>
                                            <th className="px-6 py-4 font-semibold">Contact</th>
                                            <th className="px-6 py-4 font-semibold">License Details</th>
                                            <th className="px-6 py-4 font-semibold">Current Vehicle</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-500">
                                                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                                                <p className="font-medium">Loading fleet data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {activeTab === 'vehicles' ? (
                                            filteredVehicles.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No vehicles found.</td>
                                                </tr>
                                            ) : (
                                                filteredVehicles.slice((vehiclePage - 1) * itemsPerPage, vehiclePage * itemsPerPage).map(vehicle => (
                                                    <tr key={vehicle._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white font-mono">{vehicle.plateNumber}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-gray-900 dark:text-white font-medium">{vehicle.type}</div>
                                                            <div className="text-xs text-gray-500">{vehicle.capacityKg} kg</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            {(() => {
                                                                const assignedDriver = (drivers || []).find((d: any) =>
                                                                    d.assignedVehicle?._id === vehicle._id || d.assignedVehicle === vehicle._id
                                                                );
                                                                return assignedDriver ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                            {assignedDriver.firstName?.substring(0, 1) ?? '?'}
                                                                        </div>
                                                                        {assignedDriver.firstName} {assignedDriver.lastName}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 italic">Unassigned</span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={14} className="text-gray-400" />
                                                                {vehicle.nextMaintenanceDate ? new Date(vehicle.nextMaintenanceDate).toLocaleDateString() : 'Not set'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${getStatusColor(vehicle.status)}`}>
                                                                {vehicle.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {vehicle.status === 'Maintenance' ? (
                                                                    /* Vehicle is in maintenance — only action is to restore it */
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await api.patch(`/fleet/vehicles/${vehicle._id}`, { status: 'Available' });
                                                                                fetchData();
                                                                            } catch (err) {
                                                                                console.error('Failed to update vehicle status:', err);
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                                                                    >
                                                                        <CheckCircle2 size={13} />
                                                                        Mark Available
                                                                    </button>
                                                                ) : (
                                                                    /* Vehicle is Available or On Trip — can log maintenance */
                                                                    <button
                                                                        onClick={() => handleOpenMaintenance(vehicle)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg transition-colors border border-amber-200 dark:border-amber-800"
                                                                    >
                                                                        <Wrench size={13} />
                                                                        Log Service
                                                                    </button>
                                                                )}

                                                                {/* Service history — always visible */}
                                                                <button
                                                                    onClick={() => fetchServiceLogs(vehicle)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                                                                >
                                                                    <ClipboardList size={13} />
                                                                    History
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteTarget({ id: vehicle._id, name: vehicle.plateNumber, type: 'vehicle' })}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
                                                                    title="Delete Vehicle"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                        ) : (
                                            filteredDrivers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No drivers found.</td>
                                                </tr>
                                            ) : (
                                                filteredDrivers.slice((driverPage - 1) * itemsPerPage, driverPage * itemsPerPage).map(driver => (
                                                    <tr key={driver._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900 dark:text-white">{driver.firstName} {driver.lastName}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                                <Phone size={14} className="text-gray-400" />
                                                                {driver.phoneNumber}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                                <span className="font-medium">{driver.licenseType}</span>
                                                                {driver.licenseExpiry && (
                                                                    <span className="text-xs text-gray-400 ml-2">Exp: {new Date(driver.licenseExpiry).toLocaleDateString()}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {driver.assignedVehicle ? (
                                                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg w-fit text-xs font-mono">
                                                                    <Truck size={12} />
                                                                    {driver.assignedVehicle.plateNumber}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 italic text-xs">Unassigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${getStatusColor(driver.status)}`}>
                                                                {driver.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View Profile">
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenAssignTruck(driver)}
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                    title="Assign Truck"
                                                                >
                                                                    <Truck size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteTarget({ id: driver._id, name: `${driver.firstName} ${driver.lastName}`, type: 'driver' })}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Delete Driver"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                        )}
                                    </>
                                )}
                             </tbody>
                        </table>
                    </div>
                    {activeTab === 'vehicles'
                        ? <Pagination currentPage={vehiclePage} totalItems={filteredVehicles.length} itemsPerPage={itemsPerPage} onPageChange={setVehiclePage} />
                        : <Pagination currentPage={driverPage} totalItems={filteredDrivers.length} itemsPerPage={itemsPerPage} onPageChange={setDriverPage} />
                    }
                </div>


            {/* Modals */}
            <AddVehicleModal
                isOpen={isAddVehicleOpen}
                onClose={() => setIsAddVehicleOpen(false)}
                onSuccess={fetchData}
            />

            <LogMaintenanceModal
                isOpen={isMaintenanceOpen}
                onClose={() => setIsMaintenanceOpen(false)}
                vehicleId={selectedVehicleForMaintenance?.id || ''}
                vehiclePlate={selectedVehicleForMaintenance?.plate || ''}
                onSuccess={fetchData}
            />

            <AddDriverModal
                isOpen={isAddDriverOpen}
                onClose={() => setIsAddDriverOpen(false)}
                onSuccess={fetchData}
            />

            {selectedDriverForAssignment && (
                <AssignTruckModal
                    isOpen={isAssignTruckOpen}
                    onClose={() => { setIsAssignTruckOpen(false); setSelectedDriverForAssignment(null); }}
                    driver={selectedDriverForAssignment}
                    availableVehicles={availableVehiclesForAssignment}
                    onSuccess={fetchData}
                />
            )}

            <ServiceHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                vehicle={serviceLogVehicle}
                logs={serviceLogs}
                loading={loadingLogs}
                onLogNew={() => {
                    setIsHistoryOpen(false);
                    handleOpenMaintenance(serviceLogVehicle);
                }}
            />

            <DeleteConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={`Delete ${deleteTarget?.type === 'vehicle' ? 'Vehicle' : 'Driver'}`}
                message={`Are you sure you want to delete ${deleteTarget?.name}? This action will remove all related data and cannot be undone.`}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default Fleet;

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isDeleting }: any) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <h3 className="text-base font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        {title}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {message}
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
                            disabled={isDeleting}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
