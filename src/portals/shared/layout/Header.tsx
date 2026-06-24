import { Leaf, Search, Bell, ChevronDown, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ThemeToggle from '../component/ThemeToggle';

const Header = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'Operations Manager', role: 'operations_manager' };
    const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'OM';

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const navigate = useNavigate();
    const [unreadMessages, setUnreadMessages] = useState(0);

    const isAdmin = user.role === 'admin';

    useEffect(() => {
        if (!isAdmin) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/contact');
                const messages = res.data?.data || res.data || [];
                const count = messages.filter((m: any) => m.status === 'Unread').length;
                setUnreadMessages(count);
            } catch (err) {
                console.error('Failed to fetch unread messages:', err);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [isAdmin]);

    return (
        <header className="fixed top-[10px] left-[10px] right-[10px] h-16 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-theme z-40 px-6 flex items-center justify-between transition-colors duration-300 rounded-2xl shadow-floating">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20">
                    <Leaf className="text-white" size={18} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-base font-bold text-green-700 dark:text-green-500 tracking-tight">Fresh Sarura</h1>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Export & Farmer Hub</p>
                </div>
            </div>

            {/* Centered Search Box */}
            <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search batches, farmers, exports..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F3F6F0] border-theme focus:outline-none focus:ring-2 focus:ring-[#66BB6A] text-sm dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3">
                <ThemeToggle />
                
                {/* Message Notification (Admin only) */}
                {isAdmin && (
                    <button 
                        onClick={() => navigate('/admin/messages')}
                        className={`relative p-2.5 rounded-xl transition-all shadow-sm ${
                            unreadMessages > 0 
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                : 'bg-white/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-200 hover:bg-red-500 hover:text-white'
                        }`}
                        title="View Messages"
                    >
                        <Mail size={18} />
                        {unreadMessages > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-red-600 rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
                                {unreadMessages}
                            </span>
                        )}
                    </button>
                )}

                {/* Notification Icon */}
                <button className="relative p-2.5 rounded-xl transition-all shadow-sm bg-white/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-200 hover:bg-green-500 hover:text-white">
                    <Bell size={18} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                </button>

                {/* User Avatar & Profile */}
                <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#66BB6A] flex items-center justify-center text-white text-sm font-bold shadow-md hover:saturate-150 transition-all active:scale-95">
                        {initials}
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{user.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{formatRole(user.role)}</p>
                    </div>
                    <ChevronDown size={14} className="text-gray-400 ml-1" />
                </div>
            </div>
        </header>
    );
};

export default Header;
