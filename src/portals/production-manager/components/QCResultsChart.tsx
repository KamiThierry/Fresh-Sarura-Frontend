const QCResultsChart = () => {
  const passRate = 94.8;
  const failRate = 5.2;

  const circumference = 2 * Math.PI * 70;
  const passOffset = circumference - (passRate / 100) * circumference;
  const failOffset = circumference - (failRate / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)] h-full flex flex-col transition-colors border-theme">


      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#222222] dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>QC Results</h3>
        <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Pass vs Fail Ratio</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <svg className="transform -rotate-90 w-40 h-40">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#F3F6F0"
              strokeWidth="20"
              fill="transparent"
              className="dark:stroke-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#2E7D32"
              strokeWidth="20"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={passOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-[#222222] dark:text-white">{passRate}%</span>
            <span className="text-xs text-[#6B7280] dark:text-gray-400">Pass Rate</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between p-3 bg-[#F3F6F0] dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2E7D32]"></div>
            <span className="text-sm text-[#222222] dark:text-gray-200 font-medium">Passed</span>
          </div>
          <span className="text-sm font-bold text-[#222222] dark:text-white">{passRate}%</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#F3F6F0] dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-[#222222] dark:text-gray-200 font-medium">Failed</span>
          </div>
          <span className="text-sm font-bold text-[#222222] dark:text-white">{failRate}%</span>
        </div>
      </div>
    </div>
  );
};

export default QCResultsChart;
