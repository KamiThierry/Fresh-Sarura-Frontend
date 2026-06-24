import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DoorOpen, Plus, RefreshCw, Loader2, Wrench, CheckCircle2, AlertCircle, FlaskConical, Snowflake, Thermometer, Download } from 'lucide-react';
import { api } from '../../../lib/api';
import AddRoomModal from '../components/AddRoomModal';
import RoomRequestsPanel from '../components/RoomRequestsPanel';
import AssignRoomModal from '../components/AssignRoomModal';
import { useToastContext } from '@/context/ToastContext';
import { usePMContext } from '@/context/PMContext';
import { formatDate } from '@/lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';

type Room = {
    _id: string;
    name: string;
    type: 'Processing' | 'Cold Room';
    capacityKg: number;
    currentLoadKg: number;
    status: 'Available' | 'In Use' | 'Maintenance';
    createdAt: string;
};

const statusConfig = {
    'Available': { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
    'In Use': { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: FlaskConical },
    'Maintenance': { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Wrench },
};

const RoomManagement = () => {
    const [tab, setTab] = useState<'rooms' | 'requests'>('rooms');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const { showToast } = useToastContext();
    const [expandingRoom, setExpandingRoom] = useState<Room | null>(null);
    const [expandKg, setExpandKg] = useState('');
    const [clearingRoom, setClearingRoom] = useState<Room | null>(null);
    const [detailRoom, setDetailRoom] = useState<Room | null>(null);
    const [roomBatches, setRoomBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { pendingRoomRequests, refreshPendingRoomRequests } = usePMContext();

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/rooms');
            setRooms(res.data);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    const handleStatusToggle = async (room: Room) => {
        const next = room.status === 'Available' ? 'Maintenance'
            : room.status === 'Maintenance' ? 'Available'
                : null;
        if (!next) return;
        setUpdatingId(room._id);
        try {
            await api.patch(`/rooms/${room._id}`, { status: next });
            await fetchRooms();
        } catch (err) {
            console.error('Failed to update room:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleExpand = async () => {
        if (!expandingRoom || !expandKg) return;
        try {
            await api.patch(`/rooms/${expandingRoom._id}/expand`, { additionalKg: Number(expandKg) });
            setExpandingRoom(null);
            setExpandKg('');
            fetchRooms();
            showToast('Capacity Expanded', `${expandingRoom.name} now has ${Number(expandingRoom.capacityKg) + Number(expandKg)} kg capacity.`);
        } catch (err: any) {
            showToast('Failed', err.response?.data?.message || err.message);
        }
    };

    const handleClear = async () => {
        if (!clearingRoom) return;
        try {
            await api.patch(`/rooms/${clearingRoom._id}/clear`, {});
            setClearingRoom(null);
            fetchRooms();
            showToast('Room Cleared', `${clearingRoom.name} is now available.`);
        } catch (err: any) {
            showToast('Failed', err.response?.data?.message || err.message);
        }
    };

    const handleRoomClick = async (room: Room) => {
        setDetailRoom(room);
        setLoadingBatches(true);
        try {
            const res = await api.get(`/rooms/${room._id}/batches`);
            setRoomBatches(res.data);
        } catch (err) {
            console.error('Failed to fetch room batches:', err);
        } finally {
            setLoadingBatches(false);
        }
    };

    const filteredRooms = rooms.filter(r => {
        const matchesType = typeFilter === 'all' || r.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesType && matchesStatus;
    });

    const available = filteredRooms.filter(r => r.status === 'Available').length;
    const inUse = filteredRooms.filter(r => r.status === 'In Use').length;
    const maintenance = filteredRooms.filter(r => r.status === 'Maintenance').length;

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
        doc.text('ROOM MANAGEMENT & STORAGE REPORT', 15, 42);

        // ── 3. Summary Section ──
        const totalRooms = filteredRooms.length;
        const totalCapacity = filteredRooms.reduce((acc, r) => acc + (r.capacityKg || 0), 0);
        const currentLoad = filteredRooms.reduce((acc, r) => acc + (r.currentLoadKg || 0), 0);

        const summaryFields = [
            { label: 'Total Rooms', value: String(totalRooms) },
            { label: 'Available Rooms', value: String(available) },
            { label: 'In Use Rooms', value: String(inUse) },
            { label: 'Maintenance', value: String(maintenance) },
            { label: 'Total Capacity', value: totalCapacity.toLocaleString() + ' kg' },
            { label: 'Current Load', value: currentLoad.toLocaleString() + ' kg' },
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
        doc.text('PACKHOUSE ROOMS', 15, yPos + 10);

        autoTable(doc, {
            startY: yPos + 15,
            head: [['ROOM NAME', 'TYPE', 'CAPACITY (kg)', 'CURRENT LOAD (kg)', 'REMAINING (kg)', 'STATUS']],
            body: filteredRooms.map(r => [
                r.name || 'N/A',
                r.type || 'N/A',
                (r.capacityKg || 0).toLocaleString(),
                (r.currentLoadKg || 0).toLocaleString(),
                (r.capacityKg - (r.currentLoadKg || 0)).toLocaleString(),
                r.status ? r.status.toUpperCase() : 'N/A'
            ]),
            theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
            margin: { left: 15, right: 15 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 5) {
                    const s = String(data.cell.raw).toLowerCase();
                    if (s === 'available') data.cell.styles.textColor = '#16a34a';
                    else if (s === 'in use') data.cell.styles.textColor = '#2563eb';
                    else if (s === 'maintenance') data.cell.styles.textColor = '#d97706';
                }
            }
        });

        // ── 5. System Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 240) { doc.addPage(); lastY = 20; }
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99);
        doc.text('• This report provides an overview of all packhouse rooms, their capacity, and current utilization.', 15, lastY + 25);
        
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

        doc.save(`FreshSarura_RoomManagement_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <>
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Manage packhouse rooms and assign processing spaces to QC batches.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchRooms}
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
                        {tab === 'rooms' && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Plus size={15} /> Add Room
                            </button>
                        )}
                    </div>
                </div>

                {/* Action Required Banner */}
                {pendingRoomRequests.length > 0 && (
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
                                Action Required: Room Assignments
                            </h3>
                        </div>
                        {pendingRoomRequests.map((batch) => (
                            <div
                                key={batch._id}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-l-4 border-emerald-400 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group/card"
                                onClick={() => { setSelectedBatch(batch); setIsRoomModalOpen(true); }}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                                    <Thermometer size={80} />
                                </div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                Inventory Handover
                                            </span>
                                            <span className="text-xs text-gray-400">• Cold Room Request</span>
                                        </div>
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                            Assign Storage: {batch.cropName} ({batch.receivedWeightKg?.toLocaleString()} kg)
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                                            Requested by {batch.requestedBy?.name || 'Processing Team'} • {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                                        Assign Room
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats — update based on filtered rooms */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Available', value: available, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                        { label: 'In Use', value: inUse, icon: FlaskConical, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Maintenance', value: maintenance, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                                    <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{s.value}</div>
                                </div>
                                <div className={`p-3 rounded-lg ${s.bg}`}>
                                    <s.icon className={s.color} size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs row + filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
                        {(['rooms', 'requests'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t === 'rooms' ? 'All Rooms' : 'Room Requests'}
                            </button>
                        ))}
                    </div>

                    {tab === 'rooms' && (
                        <div className="flex items-center gap-3">
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm cursor-pointer"
                            >
                                <option value="all">All Types</option>
                                <option value="Processing">Processing</option>
                                <option value="Cold Room">Cold Room</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Available">Available</option>
                                <option value="In Use">In Use</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Tab 1 — Rooms Grid */}
                {tab === 'rooms' && (
                    <>
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={28} className="animate-spin text-green-500" />
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                {rooms.length === 0 ? (
                                    <>
                                        <DoorOpen size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                        <p className="text-gray-500 text-sm font-medium">No rooms added yet.</p>
                                        <p className="text-gray-400 text-xs mt-1">Click "Add Room" to register your first packhouse room.</p>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={28} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500 font-medium">No matching rooms found.</p>
                                        <button
                                            onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}
                                            className="text-xs text-green-600 font-bold mt-2 hover:underline"
                                        >
                                            Clear filters
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRooms.map(room => {
                                    const cfg = statusConfig[room.status];
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <div
                                            key={room._id}
                                            onClick={() => handleRoomClick(room)}
                                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-4 cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:shadow-md transition-all group/room"
                                        >
                                            {/* Room header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${room.type === 'Cold Room'
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                                                        }`}>
                                                        {room.type === 'Cold Room' ? <Snowflake size={18} /> : <FlaskConical size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover/room:text-emerald-600 transition-colors">
                                                            {room.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{room.type}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                                                    <StatusIcon size={11} />
                                                    {room.status}
                                                </span>
                                            </div>

                                            {/* Capacity + Load bar */}
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 font-medium">Storage Load</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {(room.currentLoadKg || 0).toLocaleString()} / {room.capacityKg.toLocaleString()} kg
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-500 ${(room.currentLoadKg / room.capacityKg) >= 0.9 ? 'bg-red-500'
                                                                : (room.currentLoadKg / room.capacityKg) >= 0.6 ? 'bg-amber-500'
                                                                    : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${Math.min(((room.currentLoadKg || 0) / room.capacityKg) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {(room.capacityKg - (room.currentLoadKg || 0)).toLocaleString()} kg remaining capacity
                                                </p>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setExpandingRoom(room)}
                                                    className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Plus size={10} /> Expand
                                                </button>

                                                {(room.currentLoadKg || 0) > 0 && room.status !== 'Maintenance' && (
                                                    <button
                                                        onClick={() => setClearingRoom(room)}
                                                        className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <CheckCircle2 size={10} /> Clear
                                                    </button>
                                                )}

                                                {room.status !== 'In Use' && (
                                                    <button
                                                        onClick={() => handleStatusToggle(room)}
                                                        disabled={updatingId === room._id}
                                                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${room.status === 'Available'
                                                                ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                            }`}
                                                    >
                                                        {updatingId === room._id ? (
                                                            <Loader2 size={10} className="animate-spin" />
                                                        ) : room.status === 'Available' ? (
                                                            <><Wrench size={10} /> Maint.</>
                                                        ) : (
                                                            <><CheckCircle2 size={10} /> Restore</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Tab 2 — Room Requests */}
                {tab === 'requests' && (
                    <RoomRequestsPanel rooms={rooms} onRoomAssigned={fetchRooms} />
                )}
            </div>

            <AddRoomModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => { setIsAddModalOpen(false); fetchRooms(); }}
            />

            <AssignRoomModal
                isOpen={isRoomModalOpen}
                onClose={() => { setIsRoomModalOpen(false); setSelectedBatch(null); }}
                batch={selectedBatch}
                onSuccess={() => {
                    refreshPendingRoomRequests();
                    showToast('Room Assigned!', `${selectedBatch?.cropName} batch is now storage-tracked.`);
                }}
            />
            {/* Expand Capacity Modal */}
            {expandingRoom && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExpandingRoom(null)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Expand Room Capacity</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            {expandingRoom.name} — current capacity: {expandingRoom.capacityKg.toLocaleString()} kg
                        </p>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Additional Capacity (kg)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={expandKg}
                            onChange={e => setExpandKg(e.target.value)}
                            placeholder="e.g. 1000"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold mb-4"
                            autoFocus
                        />
                        {expandKg && (
                            <p className="text-xs text-blue-600 font-semibold mb-4">
                                New total capacity: {(expandingRoom.capacityKg + Number(expandKg)).toLocaleString()} kg
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setExpandingRoom(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExpand}
                                disabled={!expandKg}
                                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Clear Room Confirmation */}
            {clearingRoom && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setClearingRoom(null)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Clear Room</h3>
                        <p className="text-sm text-gray-500 mb-2">
                            This will reset <span className="font-bold text-gray-900 dark:text-white">{clearingRoom.name}</span>'s load to 0 kg and mark it as Available.
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-4">
                            Only do this after all stock has physically left the room. This action is manual and irreversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setClearingRoom(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClear}
                                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors"
                            >
                                Yes, Clear Room
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Room Detail Modal */}
            {detailRoom && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailRoom(null)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className={`px-6 py-6 flex items-center justify-between ${detailRoom.type === 'Cold Room'
                                ? 'bg-blue-50/50 dark:bg-blue-900/10'
                                : 'bg-purple-50/50 dark:bg-purple-900/10'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${detailRoom.type === 'Cold Room'
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30'
                                    }`}>
                                    {detailRoom.type === 'Cold Room' ? <Snowflake size={24} /> : <FlaskConical size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{detailRoom.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{detailRoom.type} Inventory</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailRoom(null)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400"
                            >
                                <AlertCircle size={20} className="rotate-45" />
                            </button>
                        </div>

                        {/* Inventory List */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {loadingBatches ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                                    <p className="text-sm font-medium text-gray-400 tracking-wide uppercase">Scanning Inventory...</p>
                                </div>
                            ) : (roomBatches?.length || 0) === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <DoorOpen size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                                    <p className="text-gray-500 font-bold">Room is Empty</p>
                                    <p className="text-xs text-gray-400 mt-1">No batches currently assigned to this room.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            Active Batches ({roomBatches?.length || 0})
                                        </h4>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live Tracking</span>
                                        </div>
                                    </div>
                                    {roomBatches.map(batch => (
                                        <div key={batch._id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{batch.cropName}</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                            {batch.stockId || 'BATCH'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 font-medium">
                                                        Requested by {batch.requestedBy?.name || 'Processing Team'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                                        {(batch.availableWeightKg ?? (batch.processedWeightKg ?? batch.receivedWeightKg)).toLocaleString()} kg
                                                    </p>
                                                    {batch.totalAllocatedKg > 0 && (
                                                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">
                                                            {batch.totalAllocatedKg.toLocaleString()} kg Allocated
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                                        {batch.status === 'Done'
                                                            ? (batch.availableWeightKg === 0 ? 'Fully Allocated' : 'Stocked')
                                                            : batch.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-[10px]">
                                                <div className="flex gap-4 text-gray-400">
                                                    <span>Entry: {formatDate(batch.createdAt)}</span>
                                                    <span>Last Move: {new Date(batch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${batch.status === 'Done' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {batch.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Summary */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Room Load</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">
                                        {detailRoom.currentLoadKg.toLocaleString()} kg
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Occupancy</p>
                                    <p className="text-xl font-black text-emerald-600">
                                        {((detailRoom.currentLoadKg / detailRoom.capacityKg) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default RoomManagement;