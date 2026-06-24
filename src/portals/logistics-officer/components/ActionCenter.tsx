import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, Truck, Eye, Package, Plane, TrendingUp, Loader2, Scale } from 'lucide-react';
import NotificationsModal from '../../shared/component/NotificationsModal';
import { api } from '../../../lib/api';

const ActionCenter = () => {
    const navigate = useNavigate();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data || []);
        } catch (err) {
            console.error('Failed to fetch action center notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`, {});
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all', {});
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    const handleClearAll = async () => {
        try {
            await api.delete('/notifications');
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    const handleAction = (id: string, navTarget?: string) => {
        handleMarkAsRead(id);
        if (navTarget) navigate(navTarget);
    };

    // Show only unread or high priority types in action center
    const activeAlerts = notifications.filter(n => !n.isRead).slice(0, 5);

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'HARVEST_DECLARED':
                return { icon: Scale, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', actionLabel: 'Log Pickup', actionIcon: Truck, link: '/logistics/pickups' };
            case 'EXPORT_READY':
                return { icon: Package, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', actionLabel: 'Build Shipment', actionIcon: Plane, link: '/logistics/shipments' };
            case 'SHIPMENT_SCHEDULED':
                return { icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', actionLabel: 'View Shipment', actionIcon: Eye, link: '/logistics/shipments' };
            case 'SHIPMENT_DISPATCHED':
                return { icon: Plane, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', actionLabel: 'Track Flight', actionIcon: TrendingUp, link: '/logistics/shipments' };
            default:
                return { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', actionLabel: 'View Details', actionIcon: Eye, link: '/logistics/dashboard' };
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Action Required
                    </h3>
                    {activeAlerts.length > 0 && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                            {activeAlerts.length} Pending
                        </span>
                    )}
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : activeAlerts.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                                <ArrowRight className="text-green-600 rotate-[ -45deg ]" size={24} />
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">All caught up!</p>
                            <p className="text-xs text-gray-500 mt-1">No urgent actions pending right now.</p>
                        </div>
                    ) : (
                        activeAlerts.map((n) => {
                            const config = getTypeConfig(n.type);
                            const Icon = config.icon;
                            const ActionIcon = config.actionIcon;
                            return (
                                <div key={n._id} className="group">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{n.title}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>

                                            <button
                                                onClick={() => handleAction(n._id, n.link || config.link)}
                                                className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all bg-gray-50 hover:bg-indigo-600 hover:text-white dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-indigo-600 transition-colors border border-gray-100 dark:border-gray-600"
                                            >
                                                <ActionIcon size={14} />
                                                {config.actionLabel}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-center">
                    <button
                        onClick={() => setIsNotificationsOpen(true)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                    >
                        View All Notifications ({notifications.length})
                    </button>
                </div>
            </div>

            <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onClearAll={handleClearAll}
            />
        </>
    );
};

export default ActionCenter;
