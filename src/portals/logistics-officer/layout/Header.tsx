import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Loader2, ChevronDown } from 'lucide-react';
import logo from '../../../assets/sarura_logo_nav.png';
import ThemeToggle from '../../shared/component/ThemeToggle';
import NotificationsModal from '../../shared/component/NotificationsModal';
import { useNavigate } from 'react-router-dom';
import { useUniversalSearch } from '@/lib/useGlobalSearch';
import { useNotifications } from '@/context/NotificationContext';

const TYPE_COLOURS: Record<string, string> = {
    'Farmer': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    'Shipment': 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    'Crop Cycle': 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    'Vehicle': 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    'Batch': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

const Header = () => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

    // Real user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { name: 'User', role: 'Staff' };

    const { results: searchResults, loading: searchLoading } = useUniversalSearch(searchQuery, user.role);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleClearAll = async () => {
        await clearAll();
    };

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };


    return (
        <>
            <header className="fixed top-[10px] left-[10px] right-[10px] h-16 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 z-40 px-6 flex items-center justify-between transition-colors duration-300 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Fresh Sarura" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-base font-bold text-green-700 dark:text-green-500 tracking-tight">Fresh Sarura</h1>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Export &amp; Farmer Hub</p>
                    </div>
                </div>

                {/* Centered Search Box */}
                <div className="flex-1 max-w-md mx-8 hidden md:block">
                    <div className="relative" ref={dropdownRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-gray-400" size={18} />
                        {searchLoading && searchQuery.length >= 2 && (
                            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                        )}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsDropdownOpen(e.target.value.length >= 2);
                            }}
                            onFocus={() => setIsDropdownOpen(searchQuery.length >= 2)}
                            placeholder="Search shipments, farmers, routes..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F3F6F0] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
                        />

                        {/* Live Search Dropdown */}
                        {isDropdownOpen && searchQuery.length >= 2 && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                                {searchResults.length > 0 ? (
                                    <ul>
                                        {searchResults.map((result) => (
                                            <li
                                                key={result.id}
                                                onClick={() => { navigate(result.url); setSearchQuery(''); setIsDropdownOpen(false); }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                            >
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${TYPE_COLOURS[result.type] ?? 'bg-gray-100 text-gray-500'}`}>
                                                            {result.type}
                                                        </span>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{result.title}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{result.subtitle}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : !searchLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                                ) : (
                                    <div className="p-4 text-center text-sm text-gray-400">Searching...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />

                    {/* Notification Bell */}
                    <button
                        onClick={() => setIsNotificationsOpen(true)}
                        className={`relative p-2.5 rounded-xl transition-all shadow-sm ${
                            unreadCount > 0 
                                ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-white/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-200 hover:bg-green-500 hover:text-white'
                        }`}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-green-600 rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* User Avatar & Profile */}
                    <div 
                        onClick={() => navigate('/logistics/settings')}
                        className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#66BB6A] flex items-center justify-center text-white text-sm font-bold shadow-md hover:saturate-150 transition-all active:scale-95">
                            {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{user.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{formatRole(user.role)}</p>
                        </div>
                        <ChevronDown size={14} className="text-gray-400 ml-1" />
                    </div>
                </div>
            </header>

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

export default Header;
