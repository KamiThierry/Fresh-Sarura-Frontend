import { ChevronDown, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { usePMContext } from '@/context/PMContext';

const ExportTrendsChart = () => {
  const [timeRange, setTimeRange] = useState('7days');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { stock, shipments, intakeLogs } = usePMContext();

  const timeRangeOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
  ];

  const chartData = useMemo(() => {
    const now = new Date();
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const buckets: { label: string; intake: number; target: number }[] = [];

    if (timeRange === '7days') {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = d.toISOString().split('T')[0];

        const intake = intakeLogs
          .filter(log => log.createdAt?.startsWith(dateStr))
          .reduce((sum: number, log: any) => sum + (log.pickedUpWeightKg || 0), 0) / 1000;

        const target = shipments
          .filter(s => s.departureDate?.startsWith(dateStr))
          .reduce((sum: number, s: any) => sum + (s.totalWeightKg || 0), 0) / 1000;

        buckets.push({ label, intake: parseFloat(intake.toFixed(2)), target: parseFloat(target.toFixed(2)) });
      }
    } else if (timeRange === '30days') {
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - w * 7 - 6);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);

        const intake = intakeLogs
          .filter(log => { const d = new Date(log.createdAt); return d >= weekStart && d <= weekEnd; })
          .reduce((sum: number, log: any) => sum + (log.pickedUpWeightKg || 0), 0) / 1000;

        const target = shipments
          .filter(s => { const d = new Date(s.departureDate); return d >= weekStart && d <= weekEnd; })
          .reduce((sum: number, s: any) => sum + (s.totalWeightKg || 0), 0) / 1000;

        buckets.push({ label: `Week ${4 - w}`, intake: parseFloat(intake.toFixed(2)), target: parseFloat(target.toFixed(2)) });
      }
    } else {
      for (let m = 2; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const intake = intakeLogs
          .filter(log => log.createdAt?.startsWith(monthStr))
          .reduce((sum: number, log: any) => sum + (log.pickedUpWeightKg || 0), 0) / 1000;

        const target = shipments
          .filter(s => s.departureDate?.startsWith(monthStr))
          .reduce((sum: number, s: any) => sum + (s.totalWeightKg || 0), 0) / 1000;

        buckets.push({ label, intake: parseFloat(intake.toFixed(2)), target: parseFloat(target.toFixed(2)) });
      }
    }

    return buckets;
  }, [stock, shipments, timeRange]);

  const totalIntake = chartData.reduce((s, d) => s + d.intake, 0);
  const totalTarget = chartData.reduce((s, d) => s + d.target, 0);
  const balance = totalTarget > 0 ? Math.round((totalIntake / totalTarget) * 100) : 0;
  const maxValue = Math.max(...chartData.flatMap(d => [d.intake, d.target]), 0.1) * 1.2;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)] h-full transition-colors duration-300 border-theme">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#222222] dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Intake vs. Export Target
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Supply vs. Demand Balance (Tonnes)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-[#2E7D32] dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm font-semibold">Balance: {totalTarget > 0 ? `${balance}%` : 'N/A'}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F3F6F0] dark:bg-gray-700 text-[#37474F] dark:text-gray-200 text-sm font-medium hover:bg-[#E0E0E0] dark:hover:bg-gray-600 transition-all"
            >
              {timeRangeOptions.find(opt => opt.value === timeRange)?.label}
              <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-20">
                {timeRangeOptions.map(option => (
                  <button key={option.value}
                    onClick={() => { setTimeRange(option.value); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${timeRange === option.value ? 'bg-[#E9F7EF] text-[#4CAF50] font-medium' : 'text-[#6B7280] hover:bg-[#F3F6F0] dark:hover:bg-gray-700'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between h-64 gap-4 px-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-32">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg text-center">
                  <p className="font-semibold mb-1 border-b border-gray-700 pb-1">{item.label}</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between"><span className="text-gray-400">Intake:</span><span className="font-mono">{item.intake}t</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Target:</span><span className="font-mono">{item.target}t</span></div>
                  </div>
                </div>
              </div>
              {/* Intake bar */}
              <div
                className="w-1/2 max-w-[24px] bg-gradient-to-t from-[#2E7D32] to-[#66BB6A] rounded-t transition-all duration-500 group-hover:opacity-90"
                style={{ height: `${maxValue > 0 ? (item.intake / maxValue) * 100 : 0}%`, minHeight: item.intake > 0 ? '4px' : '0' }}
              />
              {/* Target bar */}
              <div
                className="w-1/2 max-w-[24px] bg-gradient-to-t from-[#1565C0] to-[#42A5F5] rounded-t transition-all duration-500 group-hover:opacity-90"
                style={{ height: `${maxValue > 0 ? (item.target / maxValue) * 100 : 0}%`, minHeight: item.target > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-xs text-[#6B7280] dark:text-gray-400 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {chartData.every(d => d.intake === 0 && d.target === 0) && (
        <p className="text-center text-sm text-gray-400 mt-4">No data for this period yet.</p>
      )}

      <div className="flex items-center justify-center gap-8 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#2E7D32]"></div>
          <span className="text-sm font-medium text-[#37474F] dark:text-gray-300">Intake (Field)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1565C0]"></div>
          <span className="text-sm font-medium text-[#37474F] dark:text-gray-300">Export Target (Orders)</span>
        </div>
      </div>
    </div>
  );
};

export default ExportTrendsChart;
