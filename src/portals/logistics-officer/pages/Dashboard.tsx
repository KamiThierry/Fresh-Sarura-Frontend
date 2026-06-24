import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Scale, Plane, FileWarning, Loader2, Activity, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ShipmentBuilderModal from '../components/ShipmentBuilderModal';
import { api } from '../../../lib/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'Logistics Officer' };
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

    const [stats, setStats] = useState({
        activeFleet: 0,
        pendingPickups: 0,
        activeShipments: 0,
        pendingDocs: 0,
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState(7);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [vehiclesRes, pickupsRes, shipmentsRes, docsRes, activityRes] = await Promise.all([
                api.get('/fleet/vehicles'),
                api.get('/harvest-declarations'),
                api.get('/shipments'),
                api.get('/export-documents'),
                api.get('/logistics-activity?limit=6'),
            ]);

            const vehicles = vehiclesRes.data || [];
            const pickups = pickupsRes.data || [];
            const shipments = shipmentsRes.data || [];
            const docs = docsRes.data || [];

            const activeShipments = shipments.filter((s: any) =>
                s.status === 'PackingListGenerated' || s.status === 'Departed'
            ).length;

            // Pending docs: documents that have not been verified yet
            const pendingDocs = docs.filter((d: any) => d.status !== 'Verified').length;

            // Process chart data for the selected time range
            const daysArr = [...Array(timeRange)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const processedChartData = daysArr.map(date => {
                const dailyPickups = (pickups || []).filter((p: any) => (p.createdAt || '').startsWith(date)).length;
                const dailyShipments = (shipments || []).filter((s: any) => (s.createdAt || '').startsWith(date)).length;
                return {
                    name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    pickups: dailyPickups,
                    shipments: dailyShipments
                };
            });

            setChartData(processedChartData);

            setStats({
                activeFleet: vehicles.filter((v: any) => v.status === 'Available' || v.status === 'On Trip').length,
                pendingPickups: (pickups || []).filter((p: any) => p.status === 'Pending').length,
                activeShipments,
                pendingDocs,
            });

            setRecentActivity(activityRes.data || []);
        } catch (err) {
            console.error('Dashboard stats error:', err);
        } finally {
            setLoading(false);
            setActivityLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const statCards = [
        {
            label: 'Pending Pickups',
            value: loading ? '—' : stats.pendingPickups,
            sub: 'Awaiting field collection',
            icon: Scale,
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            color: 'text-blue-600',
            subColor: 'text-blue-500',
        },
        {
            label: 'Active Fleet',
            value: loading ? '—' : `${stats.activeFleet} Vehicles`,
            sub: 'Available',
            icon: Truck,
            bg: 'bg-green-50 dark:bg-green-900/20',
            color: 'text-green-600',
            subColor: 'text-green-500',
        },
        {
            label: 'Active Shipments',
            value: loading ? '—' : stats.activeShipments,
            sub: 'Scheduled or in transit',
            icon: Plane,
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            color: 'text-purple-600',
            subColor: 'text-orange-500',
        },
        {
            label: 'Unverified Docs',
            value: loading ? '—' : stats.pendingDocs,
            sub: stats.pendingDocs > 0 ? 'Action required' : 'All clear',
            icon: FileWarning,
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            color: 'text-amber-600',
            subColor: stats.pendingDocs > 0 ? 'text-amber-600' : 'text-green-500',
        },
    ];

    const severityStyles: Record<string, string> = {
        INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in pb-20">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-[#5cb85c] p-8 text-white shadow-lg">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Truck className="h-8 w-8 text-green-100" />
                            <h1 className="text-2xl md:text-3xl font-bold">
                                Welcome back, {user.name.trim().split(' ')[0].charAt(0).toUpperCase() + user.name.trim().split(' ')[0].slice(1).toLowerCase()}
                            </h1>
                        </div>
                        <p className="text-green-100 text-base md:text-lg opacity-90 max-w-2xl">
                            Monitor active shipments, export cycles, and fleet status in real-time.
                        </p>
                    </div>
                    {loading && (
                        <Loader2 className="animate-spin text-green-200" size={24} />
                    )}
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-green-400 opacity-20 blur-2xl pointer-events-none" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                                <p className={`text-xs font-medium mt-1 ${stat.subColor}`}>{stat.sub}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pickups vs Shipments</h3>
                                <p className="text-sm text-gray-500">Volume trends over the selected period</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <select
                                        value={timeRange}
                                        onChange={(e) => setTimeRange(Number(e.target.value))}
                                        className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 pr-10 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer outline-none transition-all"
                                    >
                                        <option value={7}>Last 7 Days</option>
                                        <option value={30}>Last 30 Days</option>
                                        <option value={90}>Last 90 Days</option>
                                    </select>
                                    <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="h-[250px] w-full">
                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin text-green-500" size={32} />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPickups" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }}
                                        />
                                        <Area
                                            type="monotone"
                                            name="Field Pickups"
                                            dataKey="pickups"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPickups)"
                                        />
                                        <Area
                                            type="monotone"
                                            name="Export Shipments"
                                            dataKey="shipments"
                                            stroke="#22c55e"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorShipments)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-full">
                    {/* Quick Actions (Vertical Lineup Grid) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-6 flex flex-col h-full">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-green-500" /> Quick Actions
                        </h2>
                        <div className="flex flex-col gap-3 flex-1">
                            {[
                                { label: 'Log Field Pickup', onClick: () => navigate('/logistics/pickups') },
                                { label: 'Create Packing List', onClick: () => setIsShipmentModalOpen(true) },
                                { label: 'Confirm Departure', onClick: () => navigate('/logistics/shipments') },
                                { label: 'Mark Cargo Dispatched', onClick: () => navigate('/logistics/shipments') },
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
            </div>

            {/* Recent Activity Table (Full Width) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time audit trail of export operations and pickups</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Time</th>
                                <th className="px-6 py-3 font-semibold">Action</th>
                                <th className="px-6 py-3 font-semibold">Event</th>
                                <th className="px-6 py-3 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {activityLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading activity...</td>
                                </tr>
                            ) : recentActivity.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No recent activity on record.</td>
                                </tr>
                            ) : recentActivity.map(event => (
                                <tr key={event._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                        {new Date(event.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {event.action}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-md truncate">
                                        {event.description}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${severityStyles[event.severity] || severityStyles.INFO}`}>
                                            {event.severity === 'INFO' ? 'Confirmed' : event.severity === 'WARNING' ? 'Warning' : 'Alert'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ShipmentBuilderModal
                isOpen={isShipmentModalOpen}
                onClose={() => setIsShipmentModalOpen(false)}
                onSuccess={fetchStats}
            />
        </div>
    );
};

export default Dashboard;
