import { ShieldCheck, Plus } from 'lucide-react';

const ROLES = [
    { name: 'Super Admin', users: 1, permissions: 'Full system access', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', badge: 'bg-green-600' },
    { name: 'Admin', users: 2, permissions: 'All portals, no system config', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', badge: 'bg-indigo-500' },
    { name: 'Production Manager', users: 5, permissions: 'PM Portal + Inventory + QC', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', badge: 'bg-blue-500' },
    { name: 'Logistics Officer', users: 4, permissions: 'Logistics Portal + Dispatch', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', badge: 'bg-amber-500' },
    { name: 'Farm Manager', users: 8, permissions: 'Farm Portal + Crop Planning', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', badge: 'bg-green-500' },
    { name: 'QC Officer', users: 6, permissions: 'QC Portal + Sampling', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', badge: 'bg-teal-500' },
];

const RolesPermissions = () => (
    <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                    <ShieldCheck size={22} />
                </div>
                <div>
                    <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">Roles &amp; Permissions</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage access levels across the platform</p>
                </div>
            </div>
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                <Plus size={16} />
                New Role
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ROLES.map(role => (
                <div key={role.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${role.color}`}>{role.name}</span>
                        <span className="text-xs text-gray-400">{role.users} user{role.users !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">{role.permissions}</p>
                    <button className="w-full text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 py-2 rounded-lg border border-green-200 dark:border-green-800/50 transition-colors">
                        Edit Permissions
                    </button>
                </div>
            ))}
        </div>
    </div>
);

export default RolesPermissions;
