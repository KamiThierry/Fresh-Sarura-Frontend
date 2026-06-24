import { useState, useEffect } from 'react';
import { Truck, ClipboardList, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import RecordQCModal, { QCInspectionData } from '../components/RecordQCModal';
import { api } from '../../../lib/api';

type BatchStatus = 'RoomRequested' | 'Processing' | 'QCDone' | 'Done' | 'Spoiled';

interface PriorityBatch {
    id: string;
    batchId: string;
    crop: string;
    status: BatchStatus;
    supplier: string;
    grossWeight: number;
    assignedRoom?: string;
}

interface ActivityEvent {
    id: string;
    crop: string;
    status: BatchStatus;
    createdAt: string;
}

const statusStyles: Record<string, string> = {
    RoomRequested: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Processing:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    QCDone:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Done:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Spoiled:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabel: Record<string, string> = {
    RoomRequested: 'Waiting for Room',
    Processing:    'In Processing',
    QCDone:        'Awaiting PM Confirmation',
    Done:          'Done',
    Spoiled:       'Spoiled',
};

const activityDescription: Record<string, string> = {
    RoomRequested: 'Room requested — awaiting PM assignment',
    Processing:    'Room assigned — processing in progress',
    QCDone:        'Weights logged — awaiting PM confirmation',
    Done:          'Confirmed and added to stock',
    Spoiled:       'Marked as spoiled',
};

const DONUT_COLORS = ['#3b82f6', '#22c55e', '#ef4444'];


const getWeekStart = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
};

const Home = () => {
    const navigate = useNavigate();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'QC Inspector' };

    const [stats, setStats] = useState({
        pendingIntake: 0,
        pendingQC: 0,
        passedToday: 0,
        rejectionRate: 0,
    });
    const [priorityQueue, setPriorityQueue] = useState<PriorityBatch[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
    const [donutData, setDonutData] = useState([
        { name: 'Received', value: 0 },
        { name: 'Processed', value: 0 },
        { name: 'Rejected', value: 0 },
    ]);
    const [loading, setLoading] = useState(true);
    const [qcModalData, setQcModalData] = useState<QCInspectionData | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resIntake, resBatches, resStock] = await Promise.all([
                api.get('/harvest-declarations?status=Pending'),
                api.get('/processing-batches/my'),
                api.get('/stock'),
            ]);

            const allBatches: any[] = resBatches.data || [];
            const weekStart = getWeekStart();

            // --- KPI stats ---
            const pendingIntakeCount = resIntake.results || 0;
            const activeBatches = allBatches.filter(
                b => b.status !== 'Done' && b.status !== 'Spoiled'
            );

            const stockItems: any[] = resStock.data || [];
            const doneToday = stockItems.filter(
                b => new Date(b.updatedAt).toDateString() === new Date().toDateString()
            );
            const passedToday = doneToday.reduce((s: number, b: any) => s + (b.processedWeightKg || 0), 0);
            const totalReceivedToday = doneToday.reduce((s: number, b: any) => s + (b.receivedWeightKg || 0), 0);
            const totalRejectedToday = doneToday.reduce((s: number, b: any) => s + (b.rejectedWeightKg || 0), 0);
            const rejectionRate = totalReceivedToday > 0
                ? (totalRejectedToday / totalReceivedToday) * 100
                : 0;

            setStats({
                pendingIntake: pendingIntakeCount,
                pendingQC: activeBatches.length,
                passedToday,
                rejectionRate,
            });

            // --- Priority queue: only RoomRequested and Processing ---
            setPriorityQueue(
                allBatches
                    .filter(b => b.status === 'RoomRequested' || b.status === 'Processing')
                    .map(b => ({
                        id: b._id,
                        batchId: b._id,
                        crop: b.cropName,
                        status: b.status,
                        supplier: b.intakeLogId?.farmerId?.full_name || 'Generic Source',
                        grossWeight: b.receivedWeightKg,
                        assignedRoom: b.assignedRoom,
                    }))
            );

            // --- Recent activity: last 5 batches sorted newest first ---
            setRecentActivity(
                [...allBatches]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map(b => ({
                        id: b._id,
                        crop: b.cropName,
                        status: b.status,
                        createdAt: b.createdAt,
                    }))
            );

            // --- Donut: this week's totals from all batches ---
            const weekBatches = allBatches.filter(
                b => new Date(b.createdAt) >= weekStart
            );
            const weekReceived  = weekBatches.reduce((s: number, b: any) => s + (b.receivedWeightKg || 0), 0);
            const weekProcessed = weekBatches.reduce((s: number, b: any) => s + (b.processedWeightKg || 0), 0);
            const weekRejected  = weekBatches.reduce((s: number, b: any) => s + (b.rejectedWeightKg || 0), 0);

            setDonutData([
                { name: 'Received', value: Math.round(weekReceived) },
                { name: 'Processed', value: Math.round(weekProcessed) },
                { name: 'Rejected', value: Math.round(weekRejected) },
            ]);

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const kpiCards = [
        {
            label: 'Pending Intake',
            value: `${stats.pendingIntake} Declarations`,
            sub: 'Waiting for pickup',
            icon: Truck,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
        },
        {
            label: 'Pending QC',
            value: `${stats.pendingQC} Batches`,
            sub: 'Awaiting room or processing',
            icon: ClipboardList,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'Passed Today',
            value: `${Math.round(stats.passedToday).toLocaleString()} kg`,
            sub: 'Cleared for storage',
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            label: 'Rejection Rate',
            value: `${stats.rejectionRate.toFixed(1)}%`,
            sub: "Based on today's inspections",
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
        },
    ];

    return (
        <>
            <div className="p-6 space-y-6">

                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-[#5cb85c] p-8 text-white shadow-lg">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-1">
                            Welcome back, {user.name.trim().split(' ')[0].charAt(0).toUpperCase() + user.name.trim().split(' ')[0].slice(1).toLowerCase()}.
                        </h1>
                        <p className="text-green-100 text-base opacity-90">
                            Monitor today's intake, pending inspections, and packhouse floor status.
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />
                    <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-green-400 opacity-20 blur-2xl" />
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {kpiCards.map((card, i) => (
                        <div
                            key={i}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                                    <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{card.value}</div>
                                    <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${card.bg}`}>
                                    <card.icon className={card.color} size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Area: Priority Queue | Donut | Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Priority Queue (2 cols) */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Priority Queue</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Batches awaiting room or ready to log
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                                        {['Batch ID', 'Crop', 'Weight', 'Status', 'Action'].map(h => (
                                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                                                Loading queue...
                                            </td>
                                        </tr>
                                    ) : priorityQueue.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                                                No active batches right now.
                                            </td>
                                        </tr>
                                    ) : priorityQueue.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                                {row.id.slice(-6).toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                {row.crop}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                                                {row.grossWeight.toLocaleString()} kg
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[row.status]}`}>
                                                    {statusLabel[row.status]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    disabled={row.status === 'RoomRequested'}
                                                    onClick={() => setQcModalData({
                                                        intakeId: row.batchId,
                                                        crop: row.crop,
                                                        supplier: row.supplier,
                                                        grossWeight: row.grossWeight,
                                                        assignedRoom: row.assignedRoom,
                                                    })}
                                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                                                        row.status === 'RoomRequested'
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                                >
                                                    {row.status === 'RoomRequested' ? 'Pending PM' : 'Log Results'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Donut Chart (1 col) */}
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">This Week</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Performance Overview (kg)
                            </p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center p-4">
                            {donutData.every(d => d.value === 0) ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No batch data this week.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {donutData.map((_, i) => (
                                                <Cell key={i} fill={DONUT_COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => [`${value?.toLocaleString() ?? 0} kg`]}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(value) => (
                                                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">{value}</span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions (1 col) */}
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-6 flex flex-col">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ShieldAlert size={18} className="text-green-500" /> Quick Actions
                        </h2>
                        <div className="flex flex-col gap-3 flex-1">
                            {[
                                { label: 'Request a processing room', onClick: () => navigate('/qc/intake') },
                                { label: 'Log processing results',    onClick: () => navigate('/qc/processing') },
                            ].map((q, idx) => (
                                <button key={q.label} onClick={q.onClick}
                                    className={`flex items-center justify-between p-3.5 rounded-xl transition-all text-left ${idx === 0 ? 'bg-[#5cb85c] text-white shadow-lg shadow-green-900/10 hover:bg-[#4cae4c] border-transparent' : 'border border-gray-100 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/10'}`}>
                                    <span className={`text-sm font-bold ${idx === 0 ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{q.label}</span>
                                    {idx === 0 && <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">+</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Bottom Row: Recent Activity Table (Full Width) */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time audit trail of batch processing events</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Time</th>
                                    <th className="px-6 py-3 font-semibold">Action</th>
                                    <th className="px-6 py-3 font-semibold">Crop</th>
                                    <th className="px-6 py-3 font-semibold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading activity...</td>
                                    </tr>
                                ) : recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No recent activity on record.</td>
                                    </tr>
                                ) : recentActivity.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(event.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {activityDescription[event.status]}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {event.crop}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[event.status]}`}>
                                                {statusLabel[event.status]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Record QC Modal */}
            <RecordQCModal
                isOpen={!!qcModalData}
                onClose={() => setQcModalData(null)}
                data={qcModalData}
                onSubmit={async (res) => {
                    try {
                        await api.patch(`/processing-batches/${res.intakeId}/complete`, {
                            processedWeightKg: res.processedWeight,
                            rejectedWeightKg: res.rejectedWeight,
                            defectType: res.defectType,
                            assignedGrade: res.grade,
                        });
                        setQcModalData(null);
                        fetchData();
                    } catch (err) {
                        console.error('Failed to complete QC:', err);
                    }
                }}
            />
        </>
    );
};

export default Home;
