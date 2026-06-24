import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home, Users, ShieldAlert, Settings,
    BarChart3, ChevronDown, MessageSquare,
    Sprout, Truck, FlaskConical, UserCog, LogOut
} from 'lucide-react';

// ─── Sidebar Config ───────────────────────────────────────────────
const portalSections = [
    {
        role: 'Production Manager',
        icon: UserCog,
        color: 'text-green-600',
        items: [
            { label: 'Farmer Management', path: '/admin/pm/farmers' },
            { label: 'Crop Planning', path: '/admin/pm/crop-planning' },
            { label: 'Inventory & Batches', path: '/admin/pm/inventory' },
            { label: 'Room Management', path: '/admin/pm/rooms' },
            { label: 'QC Insights', path: '/admin/pm/quality-control' },
            { label: 'Traceability', path: '/admin/pm/traceability' },
            { label: 'Analytics & Reporting', path: '/admin/pm/analytics' },

        ],
    },
    {
        role: 'Farm Manager',
        icon: Sprout,
        color: 'text-emerald-600',
        items: [
            { label: 'Crop Planning', path: '/admin/fm/crop-planning' },
            { label: 'Yield Forecast', path: '/admin/fm/yield-forecast' },
            { label: 'Performance', path: '/admin/fm/performance' },
        ],
    },
    {
        role: 'QC Officer',
        icon: FlaskConical,
        color: 'text-purple-600',
        items: [
            { label: 'Home', path: '/admin/qc/home' },
            { label: 'Intake', path: '/admin/qc/intake' },
            { label: 'Processing', path: '/admin/qc/processing' },
            { label: 'Cold Room (Stock)', path: '/admin/qc/cold-room' },
        ],
    },
    {
        role: 'Logistics Officer',
        icon: Truck,
        color: 'text-blue-600',
        items: [
            { label: 'Dashboard', path: '/admin/logistics/dashboard' },
            { label: 'Pending Pickup', path: '/admin/logistics/pickup' },
            { label: 'Export Shipments', path: '/admin/logistics/shipments' },
            { label: 'Fleet', path: '/admin/logistics/fleet' },
            { label: 'Documents', path: '/admin/logistics/documents' },
        ],
    },
];

const mainGroups = [
    {
        title: 'Overview',
        items: [
            { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
        ],
    },
    {
        title: 'Administration',
        items: [
            { path: '/admin/users',       icon: Users,          label: 'User Management' },
            { path: '/admin/event-logs',  icon: ShieldAlert,    label: 'Event Logs' },
            { path: '/admin/reports',     icon: BarChart3,      label: 'Analytics & Reports' },
            { path: '/admin/messages',    icon: MessageSquare,  label: 'Messages' },
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────
const Sidebar = () => {
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggle = (role: string) =>
        setOpenSection(prev => prev === role ? null : role);

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

    const subLinkClass = ({ isActive }: { isActive: boolean }) =>
        `block px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${isActive
            ? 'text-green-700 font-semibold bg-green-100 dark:bg-green-900/30 dark:text-green-400'
            : 'text-gray-500 hover:text-green-700 hover:bg-green-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-green-400'
        }`;

    return (
        <aside className="fixed left-[10px] top-[84px] bottom-[10px] w-[260px] bg-gradient-to-b from-green-50 to-white dark:from-[#1F2937] dark:to-gray-900 border border-green-100 dark:border-gray-700 rounded-2xl shadow-xl z-30 flex flex-col transition-colors duration-300 hidden md:flex">
            <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">

                {/* ── Main Groups (Overview + Administration) ── */}
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
                                <NavLink key={item.path} to={item.path} className={linkClass}>
                                    <item.icon size={18} strokeWidth={2} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}

                {/* ── Portal Access (Collapsible) ── */}
                <div className="mb-1">
                    <div className="flex items-center px-3 mb-1 mt-2">
                        <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Portal Access
                        </h3>
                        <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-600 ml-2" />
                    </div>

                    <div className="space-y-0.5">
                        {portalSections.map(section => {
                            const Icon = section.icon;
                            const isOpen = openSection === section.role;

                            return (
                                <div key={section.role}>
                                    {/* Section Toggle Button */}
                                    <button
                                        onClick={() => toggle(section.role)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-gray-500 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    >
                                        <Icon size={18} strokeWidth={2} className={section.color} />
                                        <span className="font-medium text-sm flex-1 text-left">
                                            {section.role}
                                        </span>
                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>

                                    {/* Dropdown Items */}
                                    {isOpen && (
                                        <div className="ml-4 mt-0.5 mb-1 pl-3 border-l-2 border-green-200 dark:border-green-800 flex flex-col gap-0.5">
                                            {section.items.map(item => (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    className={subLinkClass}
                                                >
                                                    {item.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* ── Bottom: Settings + Log Out ── */}
            <div className="p-3 mt-auto mb-2">
                <div className="flex items-center px-3 mb-2">
                    <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        System
                    </h3>
                    <div className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-600 ml-2" />
                </div>
                <div className="space-y-0.5">
                    <NavLink to="/admin/settings" className={linkClass}>
                        <Settings size={18} strokeWidth={2} />
                        <span className="font-medium text-sm">Settings</span>
                    </NavLink>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                        <LogOut size={18} strokeWidth={2} />
                        <span className="font-medium text-sm">Log Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
