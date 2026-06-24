import { Bell } from 'lucide-react';

const NotificationsPage = () => (
    <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                <Bell size={22} />
            </div>
            <div>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">System-wide alerts and announcements</p>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700/50">
            {[
                { title: 'New User Registration', sub: 'Alice Kamana — awaiting role assignment', time: '2 min ago', dot: 'bg-green-500', unread: true },
                { title: 'Permission Override Detected', sub: 'Role "QC Officer" was edited', time: '18 min ago', dot: 'bg-red-500', unread: true },
                { title: 'System Alert', sub: 'Storage utilisation at 87%', time: '1 hr ago', dot: 'bg-amber-500', unread: true },
                { title: 'System Backup Complete', sub: 'All data backed up successfully', time: '3 hrs ago', dot: 'bg-green-500', unread: false },
            ].map((n, i) => (
                <div key={i} className={`flex items-start gap-4 px-5 py-4 ${n.unread ? 'bg-green-50/30 dark:bg-green-900/5' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors`}>
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.dot}`} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{n.sub}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
                </div>
            ))}
        </div>
    </div>
);

export default NotificationsPage;
