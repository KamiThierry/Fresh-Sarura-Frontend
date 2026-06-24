import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Scale, Users, CloudSun, AlertTriangle,
    Activity, TrendingUp, Truck, Package,
    Sprout, Leaf, Calendar, Loader2,
    Clock, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import HarvestReadyModal from '../components/HarvestReadyModal';
import RequestSuppliesModal from '../components/RequestSuppliesModal';
import { useFarmManager } from '../../../lib/useFarmManager';
import { useToastContext } from '@/context/ToastContext';

const FarmDashboard = () => {
    const navigate = useNavigate();
    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
    const [isSuppliesModalOpen, setIsSuppliesModalOpen] = useState(false);
    const [timeRange, setTimeRange] = useState(30); // days
    const { showToast } = useToastContext();

    const { dashboard, cycles, activity, loading, submitBudgetRequest, declareHarvest } = useFarmManager();

    // Get farmer name from localStorage user object (set at login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const rawName = dashboard?.farmer?.full_name || user?.name || 'Farm Manager';
    const farmerName = rawName.trim().split(' ')[0].charAt(0).toUpperCase() + rawName.trim().split(' ')[0].slice(1).toLowerCase();

    const activeCycles = cycles.filter((c: any) => {
        const s = (c.status || '').toLowerCase();
        return s === 'active' || s === 'in_progress' || s === 'harvesting';
    });

    const stats = [
        {
            icon: Scale,
            label: 'Active Cycles',
            value: loading ? '—' : String(activeCycles.length),
            sub: `${cycles.length} total cycles`,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            icon: Users,
            label: 'Farm Size',
            value: loading ? '—' : `${dashboard?.farmer?.farm_size_hectares ?? '—'} Ha`,
            sub: dashboard?.farmer?.district || 'Location',
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            icon: CloudSun,
            label: 'Pending Requests',
            value: loading ? '—' : String(dashboard?.summary?.pendingRequests ?? 0),
            sub: 'Awaiting PM approval',
            color: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
        },
        {
            icon: AlertTriangle,
            label: 'Forecasts Pending',
            value: loading ? '—' : String(dashboard?.summary?.pendingForecasts ?? 0),
            sub: 'Awaiting verification',
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
        },
    ];

    const quickActions = [
        {
            icon: Truck,
            title: 'Declare Harvest Ready',
            sub: 'Request truck pickup for completed yield.',
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-600/20',
            hoverColor: 'hover:border-green-600',
            onClick: () => setIsHarvestModalOpen(true),
        },
        {
            icon: Activity,
            title: 'Log Activity',
            sub: 'Mark crop cycle tasks as complete.',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-600/20',
            hoverColor: 'hover:border-blue-600',
            onClick: () => navigate('/farm-manager/crop-planning'),
        },
        {
            icon: TrendingUp,
            title: 'Yield Forecast',
            sub: 'Update expected harvest volumes.',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-600/20',
            hoverColor: 'hover:border-purple-600',
            onClick: () => navigate('/farm-manager/yield-forecast'),
        },
        {
            icon: Package,
            title: 'Request Supplies',
            sub: 'Request seeds, fertilizers, or tools.',
            color: 'text-amber-600',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-600/20',
            hoverColor: 'hover:border-amber-600',
            onClick: () => setIsSuppliesModalOpen(true),
        },
    ];

    // Build chart data comparing Actual Spend vs Planned Budget
    const budgetData = cycles
        .filter((c: any) => {
            if (!c.createdAt) return true; // Show if no date (fallback)
            const created = new Date(c.createdAt);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= timeRange;
        })
        .slice(0, 5)
        .map((c: any) => ({
            name: c.crop_name?.length > 12 ? c.crop_name.substring(0, 10) + '...' : c.crop_name || 'Cycle',
            actual: c.spent || 0,
            planned: c.total_budget || 0,
        }));

    // Currency formatter
    const formatCurrency = (val: number) => {
        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
        return val.toString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <>
            <div className="p-4 md:p-6 space-y-6 pb-24">

                {/* Hero */}
                <div className="relative overflow-hidden rounded-2xl bg-[#5cb85c] p-8 text-white shadow-lg">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Sprout className="h-8 w-8 text-green-100" />
                            <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {farmerName}</h1>
                        </div>
                        <p className="text-green-100 text-base md:text-lg opacity-90 max-w-2xl">
                            {dashboard?.farmer?.district
                                ? `Managing ${dashboard.farmer.farm_size_hectares} Ha in ${dashboard.farmer.district} — Track your field operations and harvest targets.`
                                : 'Track your field operations, weather, and harvest targets.'}
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />
                    <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-green-400 opacity-20 blur-2xl" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">{stat.label}</p>
                                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                                </div>
                                <div className={`p-2.5 md:p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={stat.color} size={20} />
                                </div>
                            </div>
                            <p className={`text-xs md:text-sm font-medium ${stat.color}`}>{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={action.onClick}
                            className={`flex items-center gap-3 md:gap-4 p-4 rounded-xl border ${action.borderColor} bg-white dark:bg-gray-800 dark:border-white/10 shadow-sm transition-all duration-200 ${action.hoverColor} hover:shadow-md text-left group`}
                        >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${action.bgColor} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}>
                                <action.icon className={action.color} size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">{action.title}</h3>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{action.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Chart + Active Cycles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Budget Spent Per Cycle</h4>
                                <p className="text-xs text-gray-500">Actual spend vs budget per active cycle</p>
                            </div>
                            <div className="relative group">
                                <select 
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(Number(e.target.value))}
                                    className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-2 pr-10 text-xs font-bold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/80 transition-all outline-none"
                                >
                                    <option value={7}>Last 7 Days</option>
                                    <option value={30}>Last 30 Days</option>
                                    <option value={90}>Last 90 Days</option>
                                </select>
                                <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {budgetData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={budgetData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                            tickFormatter={formatCurrency}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} 
                                            contentStyle={{ 
                                                borderRadius: '12px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                            formatter={(value: any) => [`${Number(value).toLocaleString()} Rwf`]}
                                        />
                                        <Legend 
                                            verticalAlign="top" 
                                            align="right" 
                                            iconType="circle"
                                            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
                                        />
                                        <Bar 
                                            name="Planned Budget" 
                                            dataKey="planned" 
                                            fill="#D97706" 
                                            radius={[4, 4, 0, 0]} 
                                            barSize={20} 
                                        />
                                        <Bar 
                                            name="Actual Spend" 
                                            dataKey="actual" 
                                            fill="#059669" 
                                            radius={[4, 4, 0, 0]} 
                                            barSize={20} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                    No cycle data yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Cycles Widget */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Leaf size={18} className="text-green-600" />
                                Active Crop Cycles
                            </h4>
                        </div>
                        <div className="flex-1 overflow-auto p-2">
                            {activeCycles.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No active cycles</div>
                            ) : (
                                activeCycles.map((cycle: any) => (
                                    <div 
                                        key={cycle._id} 
                                        onClick={() => navigate('/farm-manager/crop-planning')}
                                        className="flex items-center justify-between p-3 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl transition-all cursor-pointer group mb-1 border border-transparent hover:border-green-100 dark:hover:border-green-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 font-bold text-xs group-hover:scale-110 transition-transform">
                                                {cycle.crop_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-600 transition-colors">{cycle.crop_name}</p>
                                                <p className="text-xs text-gray-500">{cycle.season}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                            (cycle.status === 'in_progress' || cycle.status === 'harvesting')
                                            ? 'bg-amber-100 text-amber-700 animate-pulse'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {(cycle.status === 'in_progress' || cycle.status === 'harvesting') ? 'In Progress' : cycle.status?.charAt(0).toUpperCase() + cycle.status?.slice(1)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => navigate('/farm-manager/crop-planning')}
                                className="w-full py-2 text-xs font-bold text-center text-green-600 hover:text-green-700 transition-colors"
                            >
                                View All Field Plans →
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time update on your field tasks and reports</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Time</th>
                                    <th className="px-6 py-3 font-semibold">Event</th>
                                    <th className="px-6 py-3 font-semibold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {!activity || activity.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No recent activity recorded</td>
                                    </tr>
                                ) : (
                                    activity.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(item.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                                                {item.event}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    item.status === 'Approved' || item.status === 'Verified' || item.status === 'Active' || item.status === 'Success'
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.status === 'Pending' || item.status === 'Submitted'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : item.status === 'Flagged' || item.status === 'Rejected'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <HarvestReadyModal
                isOpen={isHarvestModalOpen}
                onClose={() => setIsHarvestModalOpen(false)}
                cycles={activeCycles}
                onSubmitConfirm={async (data) => {
                    try {
                        await declareHarvest(data);
                        showToast('Harvest Declared', 'The logistics team has been notified for pickup.');
                        setIsHarvestModalOpen(false);
                    } catch (error) {
                        console.error(error);
                    }
                }}
            />
            <RequestSuppliesModal
                isOpen={isSuppliesModalOpen}
                onClose={() => setIsSuppliesModalOpen(false)}
                cycles={cycles}
                onSubmit={async (request) => {
                    try {
                        // Clean line items to match backend expected shape
                        const cleanLineItems = request.lineItems.map(item => ({
                            activityName: item.activityName,
                            category: item.category,
                            estimatedCostRwf: item.estimatedCostRwf
                        }));

                        await submitBudgetRequest({
                            cycleId: String(request.cycleId),
                            cycleName: request.cycleName,
                            startDate: request.startDate,
                            endDate: request.endDate,
                            lineItems: cleanLineItems,
                        });
                        showToast('Supplies Requested', 'Your budget request has been sent to the Production Manager.');
                        setIsSuppliesModalOpen(false);
                    } catch (error) {
                        console.error(error);
                    }
                }}
            />
        </>
    );
};

export default FarmDashboard;