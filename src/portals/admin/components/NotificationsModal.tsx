import { createPortal } from 'react-dom';
import { X, Bell, AlertTriangle, UserPlus, ShieldAlert, CheckCircle, Info, Clock, Trash2, CheckCheck } from 'lucide-react';

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: any[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
}

const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'registration': return { icon: UserPlus, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
        case 'alert':
        case 'critical': return { icon: ShieldAlert, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
        case 'warning': return { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' };
        case 'success': return { icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
        default: return { icon: Info, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800' };
    }
};

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
};

const NotificationsModal = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onClearAll }: NotificationsModalProps) => {
    if (!isOpen) return null;

    const unreadNotifications = notifications.filter(n => !n.isRead);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 h-[480px] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <Bell size={18} className="text-green-600 dark:text-green-400" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Notifications</h2>
                        {unreadNotifications.length > 0 && (
                            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {unreadNotifications.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/40 dark:bg-gray-900/30 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <Bell size={24} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No notifications yet</p>
                            <p className="text-xs text-gray-400 mt-1">We'll notify you when something happens</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const { icon: Icon, color } = getIcon(n.type);
                            return (
                                <div 
                                    key={n._id} 
                                    onClick={() => !n.isRead && onMarkAsRead(n._id)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                                        n.isRead 
                                            ? 'bg-white/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 opacity-75' 
                                            : 'bg-white dark:bg-gray-700 border-green-100 dark:border-green-900/30 shadow-sm hover:border-green-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-bold truncate ${n.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                                    <Clock size={10} /> {formatTime(n.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                                        </div>
                                    </div>
                                    {!n.isRead && (
                                        <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-green-500 rounded-full" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex items-center justify-between gap-4">
                    <button
                        onClick={onMarkAllAsRead}
                        disabled={unreadNotifications.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckCheck size={14} /> Mark all as read
                    </button>
                    <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <button
                        onClick={onClearAll}
                        disabled={notifications.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NotificationsModal;
