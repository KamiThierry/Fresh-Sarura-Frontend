import { useState } from 'react';
import {
    TrendingUp, ShieldCheck, Clock, Package,
    CheckCircle2, FileText, Camera,
    Loader2
} from 'lucide-react';
import Pagination from '../../shared/component/Pagination';
import { useFarmManager } from '../../../lib/useFarmManager';

const Performance = () => {
    const { cycles, fieldReports, forecasts, loading } = useFarmManager();
    const [activeTab, setActiveTab] = useState<'harvests' | 'tasks'>('harvests');
    const [harvestPage, setHarvestPage] = useState(1);
    const [taskPage, setTaskPage] = useState(1);
    const itemsPerPage = 5;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                <Loader2 size={32} className="animate-spin text-green-600" />
                <p className="text-sm font-medium">Loading performance data...</p>
            </div>
        );
    }

    // ─── Data Processing ───────────────────────────────────────────────────

    // 1. Collect all harvests from all cycles
    const allHarvests = cycles.flatMap((c: any) => 
        (c.myHarvests || []).map((h: any) => ({
            ...h,
            cycleId: c.cycleId,
            cropName: c.crop_name
        }))
    );
    
    // 2. Metrics Calculation
    // Total Yield: Sum of predictionKg from VERIFIED yield reports (forecasts)
    const verifiedForecasts = forecasts.filter((f: any) => f.status === 'Verified');
    const totalYield = verifiedForecasts.reduce((sum, f: any) => sum + (f.predictionKg || 0), 0);

    const flaggedCount = fieldReports.filter((r: any) => r.status === 'Flagged').length;

    // Verified Forecasts: how many forecasts the PM has verified
    const totalForecasts = forecasts.length;
    const verifiedForecastCount = verifiedForecasts.length;
    const verifiedRate = totalForecasts > 0
        ? Math.round((verifiedForecastCount / totalForecasts) * 100)
        : 0;

    // Quality Score: Start at 100%, deduct 5% for each flagged report (min 50%)
    const qualityScore = Math.max(50, 100 - (flaggedCount * 5));
    const qualityGrade = qualityScore >= 95 ? 'A+' : qualityScore >= 90 ? 'Grade A' : qualityScore >= 80 ? 'Grade B' : 'Grade C';

    // 3. Mapping for Tabs
    const harvestLogs = allHarvests.map((h: any) => ({
        id: h._id,
        date: new Date(h.createdAt).toLocaleDateString('en-US', { 
            month: 'short', day: '2-digit', year: 'numeric' 
        }),
        batchId: h.cycleId || 'N/A',
        crop: h.cropName,
        quantity: h.estimatedWeightKg ? `${h.estimatedWeightKg} kg` : 'N/A',
        status: h.status === 'PickedUp' ? 'Picked Up' : h.status
    }));

    const taskHistory = fieldReports.map((r: any) => ({
        id: r._id,
        task: r.description,
        dueDate: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        completedDate: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        evidence: !!r.proofUrl,
        proofUrl: r.proofUrl,
        status: r.status === 'Cleared' ? 'Compliant' : r.status === 'Flagged' ? 'Flagged' : 'Pending'
    }));

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Performance History</h1>
                <p className="text-gray-500 dark:text-gray-400">Track your yield, quality, and compliance records based on cloud data.</p>
            </div>

            {/* Top Stats Row (The Scorecard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Yield */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group transition-all hover:border-green-200 dark:hover:border-green-900/40">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Yield</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {totalYield.toLocaleString()} <span className="text-base font-medium text-gray-400">kg</span>
                        </h3>
                        <p className="text-xs text-green-600 font-medium mt-1">Life-time Total</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full text-green-600 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                </div>

                {/* Quality Score */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group transition-all hover:border-blue-200 dark:hover:border-blue-900/40">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quality Score</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {qualityScore}% <span className="text-base font-medium text-gray-400">{qualityGrade}</span>
                        </h3>
                        <p className="text-xs text-blue-600 font-medium mt-1">Based on PM Feedback</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={24} />
                    </div>
                </div>

                {/* Forecasts Verified */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group transition-all hover:border-purple-200 dark:hover:border-purple-900/40">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Forecasts Verified</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {verifiedForecastCount} <span className="text-base font-medium text-gray-400">of {totalForecasts}</span>
                        </h3>
                        <p className={`text-xs font-medium mt-1 ${verifiedRate >= 60 ? 'text-purple-600' : 'text-orange-500'}`}>
                            {totalForecasts > 0 ? `${verifiedRate}% Verified by PM` : 'No forecasts yet'}
                        </p>
                    </div>
                    <div className={`p-3 rounded-full group-hover:scale-110 transition-transform ${
                        verifiedRate >= 60 ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                    }`}>
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* Main Section: Digital Logbook */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => { setActiveTab('harvests'); setHarvestPage(1); }}
                        className={`flex-1 py-4 text-sm font-bold text-center transition-all ${activeTab === 'harvests'
                            ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Package size={16} /> Harvest Logs
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('tasks'); setTaskPage(1); }}
                        className={`flex-1 py-4 text-sm font-bold text-center transition-all ${activeTab === 'tasks'
                            ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} /> Task History
                        </span>
                    </button>
                </div>

                {/* Tab Content: Harvest Logs */}
                {activeTab === 'harvests' && (
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Crop ID</th>
                                    <th className="px-6 py-4">Crop</th>
                                    <th className="px-6 py-4">Quantity</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {harvestLogs.length > 0 ? (
                                    harvestLogs.slice((harvestPage - 1) * itemsPerPage, harvestPage * itemsPerPage).map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{log.date}</td>
                                            <td className="px-6 py-4">
                                                <button className="text-sm font-mono font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                                    <FileText size={14} />
                                                    {log.batchId}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{log.crop}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-bold">{log.quantity}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    log.status === 'Pending'
                                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                        : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                }`}>
                                                    {log.status === 'Pending' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500 dark:text-gray-400">
                                            <Package size={40} className="mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No harvest records found yet.</p>
                                            <p className="text-xs opacity-60">Complete a crop cycle to see it logged here.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {harvestLogs.length > itemsPerPage && (
                            <Pagination 
                                currentPage={harvestPage} 
                                totalItems={harvestLogs.length} 
                                itemsPerPage={itemsPerPage} 
                                onPageChange={setHarvestPage} 
                            />
                        )}
                    </div>
                )}

                {/* Tab Content: Task History */}
                {activeTab === 'tasks' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-4">Task</th>
                                    <th className="px-6 py-4">Date Logged</th>
                                    <th className="px-6 py-4">Evidence</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {taskHistory.length > 0 ? (
                                    taskHistory.slice((taskPage - 1) * itemsPerPage, taskPage * itemsPerPage).map((task) => (
                                        <tr key={task.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">{task.task}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">{task.completedDate}</td>
                                            <td className="px-6 py-4">
                                                {task.evidence ? (
                                                    <a 
                                                        href={task.proofUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-emerald-500 hover:text-emerald-600 transition-colors p-1"
                                                        title="View Evidence Image"
                                                    >
                                                        <Camera size={18} />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-200 dark:text-gray-700"><Camera size={18} /></span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${task.status === 'Compliant'
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : task.status === 'Flagged'
                                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                    }`}>
                                                    {task.status === 'Compliant' && <CheckCircle2 size={12} className="mr-1" />}
                                                    {task.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-gray-500 dark:text-gray-400">
                                            <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No tasks logged yet.</p>
                                            <p className="text-xs opacity-60">Log field activities in the Crop Planning module.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {taskHistory.length > itemsPerPage && (
                            <Pagination 
                                currentPage={taskPage} 
                                totalItems={taskHistory.length} 
                                itemsPerPage={itemsPerPage} 
                                onPageChange={setTaskPage} 
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Performance;
