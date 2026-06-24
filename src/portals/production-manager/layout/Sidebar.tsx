import { NavLink } from 'react-router-dom';
import {
    Home, Users, Sprout, Package, ShieldCheck,
    BarChart3, FileCheck, Settings, DoorOpen, LogOut
} from 'lucide-react';
const Sidebar = () => {

    const navGroups = [
        {
            title: 'Main',
            items: [
                { path: '/pm', icon: Home, label: 'Home' },
            ]
        },
        {
            title: 'Operations',
            items: [
                { path: '/pm/farmers', icon: Users, label: 'Farmer Management' },
                { path: '/pm/crop-planning', icon: Sprout, label: 'Crop Planning' },
                { path: '/pm/inventory', icon: Package, label: 'Inventory & Batches' },
                { path: '/pm/rooms', icon: DoorOpen, label: 'Room Management' },
                { path: '/pm/quality-control', icon: ShieldCheck, label: 'QC Insights' },
            ]
        },
        {
            title: 'Insights',
            items: [
                { path: '/pm/analytics', icon: BarChart3, label: 'Analytics & Reporting' },
                { path: '/pm/traceability', icon: FileCheck, label: 'Traceability' },
            ]
        },
        {
            title: 'System',
            items: [
                { path: '/pm/settings', icon: Settings, label: 'Settings' },
            ]
        }
    ];

    const bottomGroup = navGroups.find(g => g.title === 'System');
    const mainGroups = navGroups.filter(g => g.title !== 'System');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${isActive
            ? 'bg-[#5cb85c] text-white shadow-lg shadow-green-900/10'
            : 'text-gray-500 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }`;

    return (
        <aside className="fixed left-[10px] top-[84px] bottom-[10px] w-[260px] bg-gradient-to-b from-green-50 to-white dark:from-[#1F2937] dark:to-gray-900 border border-green-100 dark:border-gray-700 rounded-2xl shadow-xl z-30 flex flex-col transition-colors duration-300 hidden md:flex">
            <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
                {mainGroups.map((group, i) => (
                    <div key={i} className="mb-1">
                        <div className="flex items-center px-3 mb-1 mt-2">
                            <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {group.title}
                            </h3>
                            <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-600 ml-2" />
                        </div>
                        <div className="space-y-0.5">
                            {group.items.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/pm'}
                                    className={linkClass}
                                >
                                    <div className="relative flex-shrink-0">
                                        <item.icon size={18} strokeWidth={2} />
                                    </div>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {bottomGroup && (
                <div className="p-3 mt-auto mb-2">
                    <div className="flex items-center px-3 mb-2">
                        <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {bottomGroup.title}
                        </h3>
                        <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-600 ml-2" />
                    </div>
                    <div className="space-y-0.5">
                        {bottomGroup.items.map(item => (
                            <NavLink key={item.path} to={item.path} className={linkClass}>
                                <item.icon size={18} strokeWidth={2} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </NavLink>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                            <LogOut size={18} strokeWidth={2} />
                            <span className="font-medium text-sm">Log Out</span>
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;