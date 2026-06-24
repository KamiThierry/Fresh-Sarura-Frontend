import { TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePMContext } from '@/context/PMContext';

const LossAnalyticsChart = () => {
  const { processingBatches } = usePMContext();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const now = new Date();
    const result = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed

      // Filter batches created/updated in this specific month/year
      const monthBatches = processingBatches.filter(b => {
        const bDate = new Date(b.updatedAt || b.createdAt);
        return bDate.getFullYear() === year && bDate.getMonth() === month;
      });

      const totalReceived = monthBatches.reduce((s: number, b: any) => s + (b.receivedWeightKg || 0), 0);
      const totalRejected = monthBatches.reduce((s: number, b: any) => s + (b.rejectedWeightKg || 0), 0);
      
      const lossRate = totalReceived > 0
        ? parseFloat(((totalRejected / totalReceived) * 100).toFixed(1))
        : 0;

      result.push({ 
        month: label, 
        loss: lossRate, 
        hasData: totalReceived > 0,
        received: totalReceived,
        rejected: totalRejected
      });
    }
    return result;
  }, [processingBatches]);

  const maxValue = Math.max(...data.map(d => d.loss), 10);

  // Generate SVG points based on fixed 6-month indices (0-5)
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (item.loss / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  const firstValid = data.find(d => d.hasData)?.loss ?? 0;
  const lastValid = [...data].reverse().find(d => d.hasData)?.loss ?? 0;
  const trend = firstValid > 0 ? ((lastValid - firstValid) / firstValid) * 100 : 0;
  const improving = trend <= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)] h-full flex flex-col transition-colors border-theme">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#222222] dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Loss Analytics
        </h3>
        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          Post-harvest loss trends
        </p>
      </div>

      {data.filter(d => d.hasData).length >= 2 ? (
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-1 ${improving ? 'text-[#4CAF50]' : 'text-red-500'}`}>
            {improving ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
            <span className="text-xs font-semibold">{improving ? '' : '+'}{trend.toFixed(1)}%</span>
          </div>
          <span className="text-xs text-[#6B7280] dark:text-gray-400">vs first recorded period</span>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">Not enough data to show trend yet.</p>
      )}

      <div className="flex-1 relative min-h-[140px] group">
        {data.some(d => d.hasData) ? (
          <>
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <polyline points={points} fill="none" stroke="#2E7D32" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <polyline points={`0,100 ${points} 100,100`} fill="url(#lossGradient)" />
              
              {/* Data points */}
              {data.map((item, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 100 - (item.loss / maxValue) * 100;
                return (
                  <circle 
                    key={index} 
                    cx={x} 
                    cy={y} 
                    r={hoveredIndex === index ? "3" : "1.5"} 
                    fill="#2E7D32" 
                    className="transition-all duration-200"
                    vectorEffect="non-scaling-stroke" 
                  />
                );
              })}

              {/* Hover targets */}
              {data.map((_, index) => {
                const x = (index / (data.length - 1)) * 100;
                const width = 100 / (data.length - 1);
                return (
                  <rect
                    key={index}
                    x={x - width / 2}
                    y="0"
                    width={width}
                    height="100"
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && (
              <div 
                className="absolute z-10 bg-white dark:bg-gray-700 shadow-xl border border-gray-100 dark:border-gray-600 rounded-lg p-3 pointer-events-none transition-all duration-200"
                style={{
                  left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
                  top: `${100 - (data[hoveredIndex].loss / maxValue) * 100}%`,
                  transform: `translate(${hoveredIndex > 3 ? '-110%' : '10%'}, -110%)`
                }}
              >
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {data[hoveredIndex].month} Statistics
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Loss Rate:</span>
                    <span className="text-xs font-bold text-red-600">{data[hoveredIndex].loss}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Received:</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{data[hoveredIndex].received.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Rejected:</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{data[hoveredIndex].rejected.toLocaleString()} kg</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">No loss data yet.</div>
        )}
      </div>

      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <p className="text-xs text-[#6B7280] dark:text-gray-400">{item.month}</p>
            <p className="text-sm font-bold text-[#222222] dark:text-white mt-1">
              {item.hasData ? `${item.loss}%` : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LossAnalyticsChart;
