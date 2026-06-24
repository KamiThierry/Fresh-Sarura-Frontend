import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, FileWarning, Clock, Truck, Eye, Upload, ArrowRight, Bell, CheckCircle2, AlertCircle, TrendingUp, Leaf, Package, Plane, UserPlus } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
    isLog?: boolean;
}

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
}

const typeConfig = {
    BUDGET_REQUEST: {
        icon: Bell,
        iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        action: 'View Request',
        actionIcon: Eye,
        btnColor: 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    BUDGET_APPROVED: {
        icon: CheckCircle2,
        iconColor: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        action: 'View Budget',
        actionIcon: ArrowRight,
        btnColor: 'bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    BUDGET_REJECTED: {
        icon: AlertCircle,
        iconColor: 'text-red-600 bg-red-50 dark:bg-red-900/20',
        action: 'View Note',
        actionIcon: Eye,
        btnColor: 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    REPORT_FLAGGED: {
        icon: FileWarning,
        iconColor: 'text-red-600 bg-red-50 dark:bg-red-900/20',
        action: 'Fix Report',
        actionIcon: ArrowRight,
        btnColor: 'bg-red-600 hover:bg-red-700 text-white',
    },
    FORECAST_VERIFIED: {
        icon: TrendingUp,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'View Forecast',
        actionIcon: Eye,
        btnColor: 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    NEW_CYCLE: {
        icon: Leaf,
        iconColor: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        action: 'Go to Planning',
        actionIcon: ArrowRight,
        btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    YIELD_FORECAST: {
        icon: TrendingUp,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'Verify',
        actionIcon: CheckCircle2,
        btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    FIELD_REPORT: {
        icon: Upload,
        iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        action: 'Review',
        actionIcon: Eye,
        btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    HARVEST_DECLARED: {
        icon: Truck,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'Assign Pickup',
        actionIcon: Clock,
        btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    HARVEST_PICKED_UP: {
        icon: Truck,
        iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        action: 'Prep Intake',
        actionIcon: ArrowRight,
        btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    ROOM_REQUESTED: {
        icon: Bell,
        iconColor: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        action: 'Assign Room',
        actionIcon: ArrowRight,
        btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    ROOM_ASSIGNED: {
        icon: CheckCircle2,
        iconColor: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        action: 'Start QC',
        actionIcon: TrendingUp,
        btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    QC_COMPLETED: {
        icon: TrendingUp,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'View Stock',
        actionIcon: Eye,
        btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    EXPORT_READY: {
        icon: Package,
        iconColor: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        action: 'Build Shipment',
        actionIcon: Plane,
        btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    SHIPMENT_SCHEDULED: {
        icon: Clock,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'View Shipment',
        actionIcon: Eye,
        btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    SHIPMENT_DISPATCHED: {
        icon: Plane,
        iconColor: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        action: 'Track Flight',
        actionIcon: TrendingUp,
        btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    // Generic Admin/System types
    REGISTRATION: {
        icon: UserPlus,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        action: 'Manage User',
        actionIcon: ArrowRight,
        btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    CRITICAL: {
        icon: FileWarning,
        iconColor: 'text-red-600 bg-red-50 dark:bg-red-900/20',
        action: 'Review Alert',
        actionIcon: Eye,
        btnColor: 'bg-red-600 hover:bg-red-700 text-white',
    },
    WARNING: {
        icon: AlertCircle,
        iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
        action: 'Check Activity',
        actionIcon: Eye,
        btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    SUCCESS: {
        icon: CheckCircle2,
        iconColor: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        action: 'View Detail',
        actionIcon: Eye,
        btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    INFO: {
        icon: Bell,
        iconColor: 'text-gray-600 bg-gray-50 dark:bg-gray-800',
        action: 'View',
        actionIcon: Eye,
        btnColor: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    }
};

const NotificationsModal = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onClearAll }: NotificationsModalProps) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleAction = (id: string, navTarget?: string) => {
        onMarkAsRead(id);
        if (navTarget) navigate(navTarget);
        onClose();
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return formatDate(date);
    };

    return createPortal(
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <Bell size={18} className="text-green-600 dark:text-green-400" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Notifications</h2>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {notifications.filter(n => !n.isRead).length}
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

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-50/40 dark:bg-gray-900/30">
                    {notifications.length === 0 ? (
                        <div className="py-20 text-center">
                            <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm font-medium text-gray-500">All caught up!</p>
                            <p className="text-xs text-gray-400">No new notifications.</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const config = (typeConfig as Record<string, any>)[n.type] || typeConfig.BUDGET_REQUEST;
                            const Icon = config.icon;
                            const ActionIcon = config.actionIcon;

                            // Dynamic styles for unread states
                            const unreadBorderColor = n.type === 'BUDGET_REJECTED' || n.type === 'REPORT_FLAGGED' ? 'border-l-red-500' : 
                                                    (n.type === 'BUDGET_APPROVED' || n.type === 'NEW_CYCLE' || n.type === 'FIELD_REPORT') ? 'border-l-green-500' : 
                                                    (n.type === 'FORECAST_VERIFIED' || n.type === 'YIELD_FORECAST') ? 'border-l-blue-500' : 'border-l-amber-500';

                            return (
                                <div
                                    key={n._id}
                                    className={`relative p-4 rounded-xl border transition-all duration-300 ${
                                        n.isRead 
                                            ? 'bg-gray-50/40 dark:bg-gray-800/20 border-gray-100 dark:border-gray-700 opacity-70 grayscale-[0.3]' 
                                            : `bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 shadow-md border-l-4 ${unreadBorderColor} scale-[1.02] z-10`
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${config.iconColor} ${n.isRead ? 'opacity-60' : 'shadow-sm'}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm tracking-tight ${n.isRead ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-900 dark:text-white font-bold'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.isRead && (
                                                    <div className="flex items-center gap-1.5 shrink-0 transition-opacity">
                                                        <span className="text-[9px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest">New</span>
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${n.isRead ? 'text-gray-400' : 'text-gray-500 dark:text-gray-300'}`}>
                                                {n.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap bg-gray-100 dark:bg-gray-900/50 px-2 py-0.5 rounded-md">
                                                    {formatTime(n.createdAt)}
                                                </span>
                                                <button
                                                    onClick={() => handleAction(n._id, n.link)}
                                                    className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                                                        n.isRead 
                                                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400' 
                                                            : config.btnColor + ' shadow-sm active:scale-95'
                                                    }`}
                                                >
                                                    <ActionIcon size={12} />
                                                    {config.action}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex items-center justify-between gap-4">
                    <button
                        onClick={onMarkAllAsRead}
                        disabled={notifications.every(n => n.isRead)}
                        className="flex-1 text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors disabled:opacity-40"
                    >
                        Mark all as read
                    </button>
                    <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <button
                        onClick={onClearAll}
                        disabled={notifications.length === 0}
                        className="flex-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                        Clear All
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NotificationsModal;
