import { usePMContext } from '@/context/PMContext';
import { useMemo } from 'react';

const statusStyles: Record<string, string> = {
  'Draft':                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'PackingListGenerated':   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Shipped':                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pending':                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'ReadyForExport':         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'RoomRequested':          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Processing':             'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Done':                   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const statusLabel: Record<string, string> = {
  'PackingListGenerated': 'Packing List Ready',
  'ReadyForExport':       'Ready for Export',
  'RoomRequested':        'Room Requested',
};

const RecentActivityTable = () => {
  const { shipments, stock } = usePMContext();

  const activities = useMemo(() => {
    const shipmentRows = [...shipments]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
      .map(s => ({
        batchId: s.plNumber || s._id?.slice(-6).toUpperCase(),
        product: (s.exportBatches || []).map((b: any) => b.cropName || b.crop).filter(Boolean).join(', ') || '—',
        status: s.status,
        destination: s.destination || '—',
        date: new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(s.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        _ts: new Date(s.updatedAt).getTime(),
      }));

    const stockRows = [...stock]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
      .map(b => ({
        batchId: b.stockId || b._id?.slice(-6).toUpperCase(),
        product: b.cropName || '—',
        status: b.status,
        destination: 'Packhouse',
        date: new Date(b.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(b.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        _ts: new Date(b.updatedAt).getTime(),
      }));

    return [...shipmentRows, ...stockRows]
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 6);
  }, [shipments, stock]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-colors border-theme h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-[#222222] dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Recent Activity
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Latest batch movements and updates
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {['Batch ID', 'Product', 'Status', 'Destination', 'Date & Time'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  No recent activity yet.
                </td>
              </tr>
            ) : (
              activities.map((activity, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-[#F3F6F0] dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm font-semibold text-[#222222] dark:text-gray-200 font-mono">
                      {activity.batchId}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#222222] dark:text-gray-300">{activity.product}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[activity.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabel[activity.status] || activity.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#222222] dark:text-gray-300">{activity.destination}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#6B7280] dark:text-gray-400 whitespace-nowrap">
                      {activity.date}
                      <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                      {activity.time}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentActivityTable;
