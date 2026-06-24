import { Building2, Plus, MapPin, Users } from 'lucide-react';

const ORGS = [
    { name: 'Fresh Sarura HQ', location: 'Kigali, Rwanda', type: 'Packhouse & HQ', members: 12, status: 'Verified' },
    { name: 'Simbi Farm A', location: 'Huye, Rwanda', type: 'Farm', members: 6, status: 'Verified' },
    { name: 'Kayonza Cooperative', location: 'Kayonza, Rwanda', type: 'Farm', members: 9, status: 'Verified' },
    { name: 'Kigali Urban Farm', location: 'Kigali, Rwanda', type: 'Farm', members: 3, status: 'Pending' },
];

const Organisations = () => (
    <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                    <Building2 size={22} />
                </div>
                <div>
                    <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">Organisations</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage farms, packhouses and partner entities</p>
                </div>
            </div>
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                <Plus size={16} />
                Add Organisation
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ORGS.map(org => (
                <div key={org.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{org.name}</p>
                                <p className="text-xs text-gray-400">{org.type}</p>
                            </div>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${org.status === 'Verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {org.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {org.location}</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {org.members} members</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default Organisations;
