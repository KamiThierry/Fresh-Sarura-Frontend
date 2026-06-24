import { Search, UserPlus, Sprout, Package } from 'lucide-react';

interface QuickActionsGridProps {
  onRegisterFarmer?: () => void;
  onCreateCycle?: () => void;
  onCreateBatch?: () => void;
  onFindBatch?: () => void;
}

const QuickActionsGrid = ({ 
  onRegisterFarmer, 
  onCreateCycle, 
  onCreateBatch,
  onFindBatch 
}: QuickActionsGridProps) => {
  const actions = [
    /* {
      icon: PlusCircle,
      title: 'Log Intake',
      sub: 'From Field/Truck',
      color: 'text-[#2E7D32]',
      bgColor: 'bg-[#E8F5E9]',
      borderColor: 'border-[#2E7D32]/20',
      hoverColor: 'hover:border-[#2E7D32]',
      action: onLogIntake,
    }, */
    {
      icon: Package,
      title: 'Create Batch',
      sub: 'Package Inventory',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-600/20',
      hoverColor: 'hover:border-purple-600',
      action: onCreateBatch,
    },
    {
      icon: UserPlus,
      title: 'Register Farmer',
      sub: 'Onboard New Farmer',
      color: 'text-[#1565C0]',
      bgColor: 'bg-[#E3F2FD]',
      borderColor: 'border-[#1565C0]/20',
      hoverColor: 'hover:border-[#1565C0]',
      action: onRegisterFarmer,
    },
    {
      icon: Sprout,
      title: 'Create Crop Cycle',
      sub: 'Plan New Season',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-700/20',
      hoverColor: 'hover:border-emerald-700',
      action: onCreateCycle,
    },
    {
      icon: Search,
      title: 'Find Batch',
      sub: 'Traceability Lookup',
      color: 'text-[#E65100]',
      bgColor: 'bg-[#FFF3E0]',
      borderColor: 'border-[#E65100]/20',
      hoverColor: 'hover:border-[#E65100]',
      action: onFindBatch,
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`flex items-center gap-4 p-4 rounded-xl border ${action.borderColor} bg-white dark:bg-gray-800 dark:border-white/10 border-theme shadow-sm transition-all duration-200 ${action.hoverColor} hover:shadow-md text-left group`}
          >
            <div className={`w-12 h-12 rounded-lg ${action.bgColor} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}>
              <action.icon className={`${action.color}`} size={24} strokeWidth={2} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-[#222222] dark:text-white truncate">{action.title}</h3>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5 truncate">{action.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
