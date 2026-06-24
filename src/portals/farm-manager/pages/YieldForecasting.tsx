import { useState, useEffect } from 'react';
import { useFarmManager } from '../../../lib/useFarmManager';
import {
    Calendar, Scale, Target,
    Leaf, CheckCircle2, History, AlertCircle
} from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

const YieldForecasting = () => {
    const { cycles, forecasts, loading, submitYieldForecast, fetchForecasts } = useFarmManager();
    const activeCycles = cycles.filter((c: any) => c.status !== 'Completed');

    // Form State
    const [selectedCycle, setSelectedCycle] = useState('');
    const [harvestDate, setHarvestDate] = useState('');
    const [quantity, setQuantity] = useState('');
    const [confidence, setConfidence] = useState('Medium');
    const [notes, setNotes] = useState('');
    const { showToast } = useToastContext();

    // Sync default cycle selection when data loads
    useEffect(() => {
        if (activeCycles.length > 0 && !selectedCycle) {
            setSelectedCycle(activeCycles[0]._id);
        }
    }, [activeCycles, selectedCycle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cycle = activeCycles.find((c: any) => c._id === selectedCycle);
        if (cycle && new Date(harvestDate) < new Date(cycle.start_date)) {
            showToast("Invalid Harvest Date", `Cannot be earlier than the cycle start date (${new Date(cycle.start_date).toLocaleDateString()}).`);
            return;
        }

        try {
            await submitYieldForecast({
                cycleId: String(selectedCycle),
                harvestDate,
                predictionKg: Number(quantity),
                confidence,
                notes
            });
            // Show success, reset form
            setHarvestDate('');
            setQuantity('');
            setConfidence('Medium');
            setNotes('');
            showToast("Forecast Submitted", "The yield estimates have been sent to the Production Manager.");
            fetchForecasts();
        } catch (err: any) {
            console.error('Forecast submission failed:', err);
            showToast("Submission Error", err.response?.data?.message || err.message || "Failed to submit forecast");
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Leaf className="text-emerald-600" />
                    Yield & Harvest Forecasts
                </h1>
                <p className="text-gray-500 mt-1">Submit weekly estimates and track harvest accuracy.</p>
            </div>

            {/* Top Stats Row (The Feedback Loop) */}
            {(() => {
                // ── Derived stats from real forecast data ──────────────────
                const pendingOrVerified = forecasts.filter((f: any) =>
                    f.harvestDate && (f.status === 'Pending' || f.status === 'Verified')
                );

                // Card 1: soonest upcoming harvest date
                const nextHarvestDate = pendingOrVerified
                    .map((f: any) => new Date(f.harvestDate))
                    .filter((d: Date) => d >= new Date())
                    .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

                const nextHarvestLabel = nextHarvestDate
                    ? nextHarvestDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : '—';

                // Card 2: sum of predictionKg from latest forecast per active cycle
                const latestPerCycle: Record<string, any> = {};
                [...forecasts].sort((a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ).forEach((f: any) => {
                    if (!latestPerCycle[f.cycleId]) latestPerCycle[f.cycleId] = f;
                });
                const estVolume = Object.values(latestPerCycle).reduce(
                    (sum: number, f: any) => sum + (f.predictionKg || 0), 0
                );
                const estVolumeLabel = estVolume > 0 ? `${estVolume.toLocaleString()} kg` : '—';

                // Card 3: verified forecast count + rate
                const totalForecasts = forecasts.length;
                const verifiedForecasts = forecasts.filter((f: any) => f.status === 'Verified');
                const verifiedCount = verifiedForecasts.length;
                const verificationRate = totalForecasts > 0
                    ? Math.round((verifiedCount / totalForecasts) * 100)
                    : null;
                const accuracyLabel = verifiedCount > 0 ? `${verifiedCount} Verified` : '—';
                const accuracySubLabel = verificationRate !== null
                    ? `${verificationRate}% of ${totalForecasts} forecast${totalForecasts !== 1 ? 's' : ''}`
                    : 'No forecasts submitted yet';

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1: Next Harvest */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Harvest Due</p>
                                {loading ? (
                                    <div className="h-7 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{nextHarvestLabel}</p>
                                )}
                            </div>
                        </div>

                        {/* Card 2: Est. Volume */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                                <Scale size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Est. Volume</p>
                                {loading ? (
                                    <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{estVolumeLabel}</p>
                                )}
                                {!loading && estVolume > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">Across {Object.keys(latestPerCycle).length} active cycle{Object.keys(latestPerCycle).length !== 1 ? 's' : ''}</p>
                                )}
                            </div>
                        </div>

                        {/* Card 3: Accuracy */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                verifiedCount === 0 ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' :
                                (verificationRate ?? 0) >= 60 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                                'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                            }`}>
                                <Target size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Accuracy</p>
                                {loading ? (
                                    <div className="h-7 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1" />
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <p className={`text-2xl font-bold ${
                                            verifiedCount === 0 ? 'text-gray-400' :
                                            (verificationRate ?? 0) >= 60 ? 'text-emerald-600' : 'text-orange-500'
                                        }`}>{accuracyLabel}</p>
                                        <span className="text-xs text-gray-400">{accuracySubLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Section: Submit Forecast (2/3 width on large screens) */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Forecast Submission</h2>
                            <p className="text-sm text-gray-500 mt-1">Provide estimates for upcoming harvests to help logistics planning.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            <div className="space-y-6">
                                {/* Crop Cycle */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Crop Cycle
                                    </label>
                                    <select
                                        value={selectedCycle}
                                        onChange={(e) => setSelectedCycle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    >
                                        {activeCycles.map((cycle: any) => (
                                            <option key={cycle._id} value={cycle._id}>{cycle.crop_name} — {cycle.season}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Harvest Date */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Expected Harvest Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                value={harvestDate}
                                                onChange={(e) => setHarvestDate(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Expected Quantity (kg)
                                        </label>
                                        <div className="relative">
                                            <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                required
                                                placeholder="e.g. 4500"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Confidence Level */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                        Confidence Level
                                    </label>
                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                        {['Low', 'Medium', 'High'].map((level) => (
                                            <button
                                                type="button"
                                                key={level}
                                                onClick={() => setConfidence(level)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${confidence === level
                                                    ? 'bg-white dark:bg-gray-600 text-emerald-600 shadow-sm'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Notes / Conditions
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Rain expected next week, might delay harvesting by 2 days."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={24} />
                                Submit Forecast
                            </button>
                        </form>
                    </div>
                </div>

                {/* Secondary Section: History (1/3 width on large screens) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <History size={20} className="text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent History</h3>
                    </div>

                    <div className="space-y-4">
                        {loading && forecasts.length === 0 ? (
                            <p className="text-sm text-gray-500 py-4 text-center">Loading forecasts...</p>
                        ) : forecasts.map((record: any) => {
                            const cycle = cycles.find((c: any) => c._id === record.cycleId);
                            const cropName = cycle ? cycle.crop_name : 'Unknown Crop';

                            return (
                                <div key={record._id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{cropName}</h4>
                                            <p className="text-xs text-gray-500">Submitted: {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${record.status === 'Verified'
                                            ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'
                                            : 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30'
                                            }`}>
                                            {record.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div>
                                            <p className="text-xs text-gray-400">Harvest Date</p>
                                            <p className="font-medium text-gray-700 dark:text-gray-200">{new Date(record.harvestDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Prediction</p>
                                            <p className="font-medium text-gray-700 dark:text-gray-200">{record.predictionKg?.toLocaleString() || 0} kg</p>
                                        </div>
                                    </div>

                                    {record.status === 'Verified' && (
                                        <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-600/50 flex items-center justify-between text-xs font-bold ${(record.accuracy || 0) >= 90 ? 'text-emerald-600' : 'text-orange-500'
                                            }`}>
                                            <span className="flex items-center gap-1.5">
                                                {(record.accuracy || 0) >= 90 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                {record.notes || record.pmReply}
                                            </span>
                                            <span>{record.accuracy}% Accuracy</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default YieldForecasting;
