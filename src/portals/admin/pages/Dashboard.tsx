import { useState, useEffect } from 'react';
import { Users, Leaf, RefreshCcw, Boxes, ShieldAlert, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AddUserModal from '../components/AddUserModal';


const StatCard = ({ label, value, sub, icon: Icon, color, onClick }: any) => (
    <div onClick={onClick}
        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 ${onClick ? 'hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer' : ''}`}>
        <div className={`p-3 rounded-xl ${color}`}><Icon size={22} /></div>
        <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, farmers: 0, cycles: 0, shipments: 0 });
    const [userName, setUserName] = useState('Admin');
    const [loading, setLoading] = useState(true);
    
    const [activityData, setActivityData] = useState([]);
    const [cycleStats, setCycleStats] = useState({ active: 0, in_progress: 0, planned: 0, completed: 0 });
    const [recentEvents, setRecentEvents] = useState([]);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

    const [activityRange, setActivityRange] = useState('90days');
    const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);

    const timeRangeOptions = [
        { value: '7days', label: 'Last 7 Days' },
        { value: '30days', label: 'Last 30 Days' },
        { value: '90days', label: 'Last 90 Days' },
    ];


    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.name) {
                    const fn = user.name.trim().split(' ')[0];
                    setUserName(fn.charAt(0).toUpperCase() + fn.slice(1).toLowerCase());
                }
            } catch { /* ignore */ }
        }

        const fetchDashboardData = async () => {
            try {
                const [usersRes, farmersRes, cyclesRes, stockRes, activityRes, cycleStatsRes, recentRes] = await Promise.allSettled([
                    api.get('/auth/users'),    
                    api.get('/farmers'),       
                    api.get('/crop-cycles'),   
                    api.get('/stock'),         
                    api.get(`/admin/stats/activity?range=${activityRange}`),
                    api.get('/admin/stats/cycles'),
                    api.get('/admin/activity/recent?limit=10')
                ]);

                console.log('Admin Dashboard: cycleStatsRes:', cycleStatsRes);

                const users   = usersRes.status   === 'fulfilled' && Array.isArray(usersRes.value.data)    ? usersRes.value.data    : [];
                const farmers = farmersRes.status === 'fulfilled' && Array.isArray(farmersRes.value.farmers) ? farmersRes.value.farmers : [];
                const cycles  = cyclesRes.status  === 'fulfilled' && Array.isArray(cyclesRes.value.data)   ? cyclesRes.value.data   : [];
                const stock   = stockRes.status   === 'fulfilled' && Array.isArray(stockRes.value.data)    ? stockRes.value.data    : [];

                setStats({
                    users:     users.length,
                    farmers:   farmers.length,
                    cycles:    cycles.filter((c: any) => c.status !== 'completed').length,
                    shipments: stock.length,
                });

                if (activityRes.status === 'fulfilled') setActivityData(activityRes.value || []);
                if (cycleStatsRes.status === 'fulfilled') {
                    const raw = cycleStatsRes.value?.data || cycleStatsRes.value || {};
                    setCycleStats({
                        active:      raw.active      ?? 0,
                        in_progress: raw.in_progress ?? 0,
                        planned:     raw.planned     ?? 0,
                        completed:   raw.completed   ?? 0,
                    });
                }
                if (recentRes.status === 'fulfilled') setRecentEvents(recentRes.value || []);

            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [activityRange]);

    const kpiCards = [
        { label: 'Total Users',        value: loading ? '...' : String(stats.users),     sub: 'Registered accounts', icon: Users,       color: 'bg-green-50 text-green-600 dark:bg-green-900/20',     onClick: () => navigate('/admin/users') },
        { label: 'Registered Farmers', value: loading ? '...' : String(stats.farmers),   sub: 'Active suppliers',    icon: Leaf,        color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' },
        { label: 'Active Crop Cycles', value: loading ? '...' : String(stats.cycles),    sub: 'In progress',         icon: RefreshCcw,  color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
        { label: 'Stock Batches',      value: loading ? '...' : String(stats.shipments), sub: 'Total on record',     icon: Boxes,       color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' },
    ];

    // Active = active + in_progress combined; remove Planned
    const totalActiveCount = (cycleStats.active ?? 0) + (cycleStats.in_progress ?? 0);
    const totalCycles = (cycleStats.active ?? 0) + (cycleStats.in_progress ?? 0) + (cycleStats.completed ?? 0);

    const cycleChartData = [
        { name: 'Active', value: cycleStats.active ?? 0, color: '#10B981' }, 
        { name: 'In Progress', value: cycleStats.in_progress ?? 0, color: '#F59E0B' }, 
        { name: 'Completed', value: cycleStats.completed ?? 0, color: '#6B7280' }, 
    ].filter(d => d.value > 0);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-[#5cb85c] p-8 text-white shadow-lg">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome back, {userName}</h1>
                        <p className="text-green-100 text-base opacity-90">Manage users, monitor operations, and oversee the full FreshSarura platform.</p>
                    </div>
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                        System: Operational
                    </span>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-green-400 opacity-20 blur-2xl pointer-events-none" />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpiCards.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Middle Row: Line Chart | Donut Chart | Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                {/* Line Chart */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Platform Activity</h2>
                            <p className="text-sm text-gray-500">
                                {timeRangeOptions.find(opt => opt.value === activityRange)?.label} overview
                            </p>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsRangeDropdownOpen(!isRangeDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-all border border-gray-100 dark:border-gray-600"
                            >
                                {timeRangeOptions.find(opt => opt.value === activityRange)?.label}
                                <ChevronDown size={14} className={`transition-transform ${isRangeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isRangeDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                    {timeRangeOptions.map(option => (
                                        <button key={option.value}
                                            onClick={() => { setActivityRange(option.value); setIsRangeDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${activityRange === option.value ? 'bg-green-50 text-green-600 font-bold dark:bg-green-900/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '3 3' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                <Line type="monotone" name="New Farmers" dataKey="farmers" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" name="Crop Cycles" dataKey="cycles" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col h-full">
                    <div className="mb-4">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Crop Cycle Status</h2>
                        <p className="text-sm text-gray-500">Current production breakdown</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        <div className="h-[200px] w-full relative mb-6">
                            {cycleChartData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={cycleChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={85}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {cycleChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Central Label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                            {totalCycles > 0 ? Math.round(((cycleStats.active + cycleStats.in_progress) / totalCycles) * 100) : 0}%
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400">No active cycles</div>
                            )}
                        </div>

                        {/* Custom Legend Table */}
                        <div className="space-y-4 flex-1">
                            {/* Active row */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Active</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-gray-400">{totalCycles > 0 ? Math.round((totalActiveCount / totalCycles) * 100) : 0}%</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white min-w-[24px] text-right">{totalActiveCount}</span>
                                </div>
                            </div>
                            {/* In Progress (subset) row */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">In Progress</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-gray-400">{totalCycles > 0 ? Math.round((cycleStats.in_progress / totalCycles) * 100) : 0}%</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white min-w-[24px] text-right">{cycleStats.in_progress}</span>
                                </div>
                            </div>
                            {/* Completed row */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#6B7280]" />
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Completed</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-gray-400">{totalCycles > 0 ? Math.round((cycleStats.completed / totalCycles) * 100) : 0}%</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white min-w-[24px] text-right">{cycleStats.completed}</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Row */}
                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Total Cycles</span>
                            <span className="text-lg font-black text-[#5cb85c]">{totalCycles}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-green-500" /> Quick Actions
                    </h2>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: 'Add User',             onClick: () => setIsAddUserModalOpen(true) },
                            { label: 'View Event Logs',      onClick: () => navigate('/admin/event-logs') },
                            { label: 'Analytics & Reports',  onClick: () => navigate('/admin/reports') },
                            { label: 'System Settings',      onClick: () => navigate('/admin/settings') },
                        ].map((q, idx) => (
                            <button key={q.label} onClick={q.onClick}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left ${idx === 0 ? 'bg-[#5cb85c] text-white shadow-lg shadow-green-900/10 hover:bg-[#4cae4c] border-transparent' : 'border border-gray-100 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/10'}`}>
                                <span className={`text-sm font-medium ${idx === 0 ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{q.label}</span>
                                {idx === 0 && <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">+</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Activity Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Global audit trail of system-wide events and registrations</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 font-medium">Time</th>
                                <th className="px-4 py-3 font-medium">Actor</th>
                                <th className="px-4 py-3 font-medium">Event</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {recentEvents.length > 0 ? (
                                recentEvents.map((evt: any) => (
                                    <tr key={evt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500">{new Date(evt.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{evt.actor}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{evt.event}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                evt.status.toLowerCase() === 'approved' || evt.status.toLowerCase() === 'success' || evt.status.toLowerCase() === 'verified' || evt.status.toLowerCase() === 'active'
                                                ? 'bg-green-50 text-green-600' 
                                                : evt.status.toLowerCase() === 'rejected' || evt.status.toLowerCase() === 'cancelled'
                                                ? 'bg-red-50 text-red-600'
                                                : evt.status.toLowerCase() === 'in_progress' || evt.status.toLowerCase() === 'harvesting'
                                                ? 'bg-amber-50 text-amber-600'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {evt.status === 'in_progress' ? 'In Progress' : evt.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No recent activity</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            <AddUserModal 
                isOpen={isAddUserModalOpen} 
                onClose={() => setIsAddUserModalOpen(false)} 
                onUserAdded={(name) => {
                    navigate('/admin/users', { state: { newUser: name } });
                }}
            />
        </div>
    );
};

export default Dashboard;
