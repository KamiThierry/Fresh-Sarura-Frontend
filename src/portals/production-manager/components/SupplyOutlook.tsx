
import {
    Truck, TrendingUp, AlertCircle, ArrowRight
} from 'lucide-react';

const SupplyOutlook = () => {
    // Mock Data: Weekly Forecasts (Aggregated from Farm Manager)
    const WEEKLY_DATA = [
        {
            week: 'Oct 1-7',
            total: 8.5,
            breakdown: [
                { crop: 'Avocado', volume: 6.0, color: 'bg-green-600' },
                { crop: 'Chili', volume: 2.5, color: 'bg-red-500' }
            ]
        },
        {
            week: 'Oct 8-14',
            total: 12.0,
            breakdown: [
                { crop: 'Avocado', volume: 8.5, color: 'bg-green-600' },
                { crop: 'Chili', volume: 3.5, color: 'bg-red-500' }
            ]
        },
        {
            week: 'Oct 15-21',
            total: 15.5,
            breakdown: [
                { crop: 'Avocado', volume: 10.0, color: 'bg-green-600' },
                { crop: 'Chili', volume: 5.5, color: 'bg-red-500' }
            ]
        },
        {
            week: 'Oct 22-28',
            total: 11.0,
            breakdown: [
                { crop: 'Avocado', volume: 7.0, color: 'bg-green-600' },
                { crop: 'Chili', volume: 4.0, color: 'bg-red-500' }
            ]
        },
    ];

    const MAX_VOLUME = 20; // For chart scaling

    // Mock Data: Upcoming Harvest Alerts
    const ALERTS = [
        {
            id: 1,
            farm: 'Simbi Farm',
            crop: 'Avocado',
            date: 'Oct 15',
            dueIn: '3 days',
            volume: 4500,
            confidence: 'High'
        },
        {
            id: 2,
            farm: 'Kayonza Co-op',
            crop: 'Chili',
            date: 'Oct 18',
            dueIn: '6 days',
            volume: 2200,
            confidence: 'Medium'
        },
        {
            id: 3,
            farm: 'Rwamagana Sector 2',
            crop: 'Beans',
            date: 'Oct 16',
            dueIn: '4 days',
            volume: 1500,
            confidence: 'High'
        }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

            {/* Main Chart Section (2/3) */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp size={20} className="text-purple-600" />
                            Weekly Supply Outlook
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Aggregated yield forecasts vs. logistics capacity.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                            <span className="text-gray-600 dark:text-gray-400">Avocado</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            <span className="text-gray-600 dark:text-gray-400">Chili</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Bar Chart Container */}
                <div className="h-64 flex items-end justify-between gap-4 select-none">
                    {WEEKLY_DATA.map((week, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group relative h-full">

                            {/* Hover Tooltip - Positioned higher */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                                    <p className="font-bold mb-1">{week.week}: {week.total} Tons</p>
                                    {week.breakdown.map((b, i) => (
                                        <p key={i} className="text-gray-300 flex justify-between gap-4">
                                            <span>{b.crop}</span>
                                            <span>{b.volume}T</span>
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="w-full max-w-[50px] bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden flex flex-col-reverse relative transition-all duration-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                                style={{ height: `${(week.total / MAX_VOLUME) * 100}%` }}>

                                {/* Stacked Segments */}
                                {week.breakdown.map((b, i) => (
                                    <div
                                        key={i}
                                        className={`${b.color} w-full`}
                                        style={{ height: `${(b.volume / week.total) * 100}%` }}
                                    />
                                ))}
                            </div>

                            {/* X-Axis Label */}
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-purple-600 transition-colors">
                                {week.week.split(' ')[1]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert Panel (1/3) */}
            <div className="col-span-1 bg-purple-50 dark:bg-gray-800/50 rounded-xl border border-purple-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Upcoming Harvests
                    </h3>
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                        Next 7 Days
                    </span>
                </div>

                <div className="space-y-3">
                    {ALERTS.map((alert) => (
                        <div key={alert.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{alert.farm}</h4>
                                    <p className="text-xs text-gray-500 font-medium">{alert.crop} • {alert.volume.toLocaleString()} kg</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-gray-900 dark:text-white">{alert.date}</span>
                                    <span className="text-[10px] text-orange-500 font-bold">In {alert.dueIn}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${alert.confidence === 'High' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                    {alert.confidence} Confidence
                                </span>
                                <button className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">
                                    <Truck size={12} />
                                    Book Transport
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="w-full mt-4 py-2 text-xs font-bold text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center justify-center gap-1">
                    View Full Forecast <ArrowRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default SupplyOutlook;
