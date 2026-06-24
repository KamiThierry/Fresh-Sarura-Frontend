import { useState, useMemo } from 'react';
import { Search, Filter, User, MapPin, Leaf, Trophy } from 'lucide-react';
import { Farmer } from '@/types';

interface FarmerDirectoryProps {
  farmers: Farmer[];
  isLoading: boolean;
  onViewProfile: (farmer: Farmer) => void;
  allStock?: any[];
}

const FarmerDirectory = ({ farmers, isLoading, onViewProfile, allStock = [] }: FarmerDirectoryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch =
      farmer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farmer.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farmer.produce_types.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (farmer.farm_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || farmer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ── Top Suppliers leaderboard ──
  const topSuppliers = useMemo(() => {
    return farmers
      .map((f) => ({
        farmer: f,
        totalKg: allStock
          .filter((b) => b.farmer_id === f._id || b.farmerId === f._id)
          .reduce((s: number, b: any) => s + (b.receivedWeightKg || 0), 0),
      }))
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, 5);
  }, [farmers, allStock]);

  const maxKg = topSuppliers[0]?.totalKg || 1;

  const rankColors = [
    'from-yellow-400 to-amber-500',
    'from-gray-300 to-gray-400',
    'from-orange-300 to-orange-400',
    'from-green-400 to-emerald-500',
    'from-teal-400 to-cyan-500',
  ];

  const rankMedals = ['🥇', '🥈', '🥉', '#4', '#5'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)] border-theme space-y-6">

      {/* ── Top Suppliers Panel ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={15} className="text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Top Suppliers by Volume</h3>
          <span className="ml-auto text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total Intake</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Loading…</p>
        ) : topSuppliers.length === 0 || maxKg === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center italic">No supply data yet</p>
        ) : (
          <div className="space-y-2.5">
            {topSuppliers.map(({ farmer, totalKg }, i) => {
              const barWidth = maxKg > 0 ? Math.round((totalKg / maxKg) * 100) : 0;
              const label = totalKg >= 1000
                ? `${(totalKg / 1000).toFixed(2)} Tons`
                : `${totalKg.toLocaleString()} kg`;
              return (
                <button
                  key={farmer._id}
                  onClick={() => onViewProfile(farmer)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-5 flex-shrink-0 font-bold text-gray-500 dark:text-gray-400">{rankMedals[i]}</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {farmer.full_name}
                    </span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">{label}</span>
                  </div>
                  <div className="ml-7 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${rankColors[i]} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700" />

      <div>
        <h3 className="text-base font-semibold text-[#2E7D32] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Farmer Directory
        </h3>

        {/* Search and Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, location, or crop type"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F9FCFA] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] text-sm"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive')}
              className="pl-10 pr-4 py-2.5 bg-[#F9FCFA] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" size={18} />
          </div>
        </div>

        {/* Farmer Cards Grid (Scrollable List) */}
        <div className="space-y-3 h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-12 text-[#6B7280]">Loading farmers...</div>
          ) : filteredFarmers.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              {searchQuery || statusFilter !== 'all' ? 'No farmers found matching your criteria' : 'No farmers registered yet'}
            </div>
          ) : (
            filteredFarmers.map((farmer) => (
              <div
                key={farmer._id}
                className="flex items-center gap-4 p-3 bg-[#F9FCFA] rounded-lg hover:bg-[#E9F7EF] transition-all border border-gray-100 hover:border-[#4CAF50] cursor-pointer"
                onClick={() => onViewProfile(farmer)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#66BB6A] flex items-center justify-center flex-shrink-0">
                  {farmer.photo_url ? (
                    <img src={farmer.photo_url} alt={farmer.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="text-white" size={16} strokeWidth={2} />
                  )}
                </div>

                {/* Farmer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-semibold text-[#222222] truncate">{farmer.full_name}</h4>
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${farmer.status === 'Active' ? 'bg-[#4CAF50]' : 'bg-gray-400'
                        }`}
                    ></span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-1">
                      <MapPin size={10} />
                      <span className="truncate max-w-[80px]">{farmer.district}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Leaf size={10} />
                      <span className="truncate">{farmer.produce_types[0]}</span>
                      {farmer.produce_types.length > 1 && <span>+{farmer.produce_types.length - 1}</span>}
                    </div>
                  </div>
                </div>

                {/* View Button */}
                <button className="text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 hover:bg-green-100 rounded">
                  View
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {!isLoading && filteredFarmers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-[#6B7280]">
            Showing {filteredFarmers.length} of {farmers.length} farmers
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerDirectory;

