import { NavLink } from 'react-router-dom';
import { Home, Users, Package, ShieldCheck, Truck, MessageSquare, BarChart3, FileCheck, Settings, Sprout } from 'lucide-react';

const Sidebar = () => {
    const navGroups = [
        {
            title: 'Main',
            items: [
                { path: '/', icon: Home, label: 'Home' },
            ]
        },
        {
            title: 'Operations',
            items: [
                { path: '/farmers', icon: Users, label: 'Farmer Management' },
                { path: '/crop-planning', icon: Sprout, label: 'Crop Planning' },
                { path: '/inventory', icon: Package, label: 'Inventory & Batches' },
                { path: '/quality-control', icon: ShieldCheck, label: 'Quality Control (QC)' },
                { path: '/logistics', icon: Truck, label: 'Logistics & Scheduling' },
                { path: '/communication', icon: MessageSquare, label: 'Communication' },
            ]
        },
        {
            title: 'Insights',
            items: [
                { path: '/analytics', icon: BarChart3, label: 'Analytics & Reporting' },
                { path: '/traceability', icon: FileCheck, label: 'Traceability' },
            ]
        },
        {
            title: 'System',
            items: [
                { path: '/settings', icon: Settings, label: 'Settings' },
            ]
        }
    ];

    const bottomGroup = navGroups.find(g => g.title === 'System');
    const mainGroups = navGroups.filter(g => g.title !== 'System');

    return (
        <aside className="fixed left-[10px] top-[84px] bottom-[10px] w-[260px] bg-white dark:bg-[#1F2937] border-theme rounded-2xl shadow-xl z-30 flex flex-col transition-colors duration-300">
            <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
                {mainGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-1">
                        {group.title && (
                            <div className="flex items-center px-3 mb-1 mt-2">
                                <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                    {group.title}
                                </h3>
                                <div className="flex-1 h-[1px] bg-gray-300 dark:bg-gray-600 ml-2"></div>
                            </div>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/'}
                                    className={({ isActive }) =>
                                        `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${isActive
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                        }`
                                    }
                                >
                                    <item.icon size={18} strokeWidth={2} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {bottomGroup && (
                <div className="p-3 mt-auto mb-2">
                    <div className="mb-1">
                        <div className="flex items-center px-3 mb-2">
                            <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                {bottomGroup.title}
                            </h3>
                            <div className="flex-1 h-[1px] bg-gray-300 dark:bg-gray-600 ml-2"></div>
                        </div>
                        <div className="space-y-0.5">
                            {bottomGroup.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${isActive
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                        }`
                                    }
                                >
                                    <item.icon size={18} strokeWidth={2} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
