import { Sprout, ChevronRight, CheckCircle2 } from 'lucide-react';
import { usePMContext } from '@/context/PMContext';
import { Link } from 'react-router-dom';

const CropCyclesOverview = () => {
  const { cycles } = usePMContext();

  // Status Counts
  const activeCount = cycles.filter(c => c.status === 'active').length;
  const harvestingCount = cycles.filter(c => c.status === 'in_progress').length;
  const totalActive = activeCount + harvestingCount;

  // Completed this month logic
  const completedThisMonth = cycles.filter(c => {
    if (c.status !== 'completed' || !c.updatedAt) return false;
    const updatedDate = new Date(c.updatedAt);
    const now = new Date();
    return updatedDate.getMonth() === now.getMonth() && updatedDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Sprout className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Crop Cycles Overview</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center mb-6">
        <div className="text-center">
            <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-1">{totalActive}</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Active Cycles</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Active Row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{activeCount}</span>
        </div>

        {/* Harvesting Row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">In Progress</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{harvestingCount}</span>
          {/* Subtle pulse background effect for in progress cycles */}
          {harvestingCount > 0 && (
            <div className="absolute inset-0 bg-amber-400/5 animate-pulse -z-10"></div>
          )}
        </div>

        {/* Completed Row */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed this month</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{completedThisMonth}</span>
        </div>
      </div>

      <Link 
        to="/pm/crop-planning" 
        className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors pt-4 border-t border-gray-50 dark:border-gray-700/50"
      >
        View All Crop Cycles
        <ChevronRight size={16} />
      </Link>
    </div>
  );
};

export default CropCyclesOverview;
