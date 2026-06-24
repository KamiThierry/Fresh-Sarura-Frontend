
import { Scale, Package, Plane, Sprout } from 'lucide-react';

interface DashboardStatsProps {
  todaysIntake?: string;
  totalStock?: string;
  activeCyclesCount?: number;
  scheduledExports?: string;
  pendingRoomRequestsCount?: number;
  userName?: string;
  scheduledShipments?: any[];
  inventoryItems?: any[];
}

const DashboardStats = ({
  todaysIntake = "0 kg",
  totalStock = "0 Tons",
  activeCyclesCount = 0,
  scheduledExports = "0 Tons",
  pendingRoomRequestsCount = 0,
  userName = "Manager",
  scheduledShipments = [],
  inventoryItems = [],
}: DashboardStatsProps) => {
  const nearlyEmptyCount = inventoryItems.filter(i => 
    i.availableKg > 0 && i.availableKg < i.processedKg * 0.2
  ).length;

  const fullyDepletedCount = inventoryItems.filter(i => 
    i.availableKg === 0 && i.status !== 'Spoiled'
  ).length;

  const totalStockKg = inventoryItems.reduce((sum, i) => sum + (i.availableKg || 0), 0);
  const totalStockDisplay = `${(totalStockKg / 1000).toFixed(1)} Tons`;

  const stats = [
    {
      icon: Scale,
      label: "Today's Intake",
      value: todaysIntake,
      sub: '+15% vs Avg',
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: Package,
      label: 'Total Stock',
      value: totalStockDisplay,
      sub: fullyDepletedCount > 0 
        ? `${fullyDepletedCount} items depleted`
        : nearlyEmptyCount > 0
        ? `${nearlyEmptyCount} items nearly empty`
        : 'Available stock only',
      color: fullyDepletedCount > 0 ? 'text-red-600 font-bold' : nearlyEmptyCount > 0 ? 'text-amber-600' : 'text-blue-600',
      bg: fullyDepletedCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : nearlyEmptyCount > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
      badge: (fullyDepletedCount + nearlyEmptyCount) > 0 ? (fullyDepletedCount + nearlyEmptyCount) : null
    },
    {
      icon: Sprout,
      label: 'Active Crop Cycles',
      value: String(activeCyclesCount),
      sub: 'Cycle Planning',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      icon: Plane,
      label: 'Scheduled to Fly',
      value: scheduledShipments.length > 0
        ? `${scheduledShipments.reduce((sum: number, s: any) => sum + (s.totalWeightKg || 0), 0) / 1000} Tons`
        : scheduledExports,
      sub: scheduledShipments.length > 0
        ? `${scheduledShipments[0].flightNumber} → ${scheduledShipments[0].destination}`
        : 'No flights scheduled',
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#5cb85c] p-8 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
          </div>
          <p className="text-green-100 text-lg opacity-90">
            Monitor your horticulture export operations and farmer network in real-time
          </p>
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-green-400 opacity-20 blur-2xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {stat.label}
                </p>
                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                {stat.sub && (
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{stat.sub}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg flex-shrink-0 ${stat.bg}`}>
                <stat.icon className={`${stat.color}`} size={24} />
              </div>
            </div>
            {'badge' in stat && stat.badge && (
              <div className="absolute top-0 right-0 -mt-1 -mr-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                  {stat.badge}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStats;
