import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import { Notification } from '@/portals/shared/component/NotificationsModal';

interface NotificationContextValue {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    refresh: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { showToast } = useToastContext();
    const hasShownBurst = useRef(false);

    const URGENT_TYPES = [
        'HARVEST_DECLARED', 'EXPORT_READY', 'ROOM_REQUESTED',
        'REPORT_FLAGGED', 'BUDGET_REJECTED'
    ];

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    // On mount: fetch immediately, then poll every 30s — single interval for the whole app
    useEffect(() => {
        setLoading(true);
        fetchNotifications().finally(() => setLoading(false));

        intervalRef.current = setInterval(fetchNotifications, 30000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchNotifications]);

    // Urgent notification burst on login/mount
    useEffect(() => {
        if (hasShownBurst.current || notifications.length === 0) return;
        hasShownBurst.current = true;

        const urgent = notifications
            .filter(n => !n.isRead && URGENT_TYPES.includes(n.type))
            .slice(0, 3);

        urgent.forEach((n, i) => {
            setTimeout(() => {
                showToast(n.title, n.message);
            }, i * 700);
        });
    }, [notifications, showToast]);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`, {});
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
        } catch (err) { console.error(err); }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all', {});
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) { console.error(err); }
    };

    const clearAll = async () => {
        try {
            await api.delete('/notifications');
            setNotifications([]);
        } catch (err) { console.error(err); }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
            loading,
            refresh: fetchNotifications,
            markAsRead,
            markAllAsRead,
            clearAll,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
    return ctx;
};
