import { useState } from 'react';
import {
    Plane, Truck, Scale, Thermometer, FileText,
    Search, Filter, Download, Plus, MoreHorizontal,
    CheckCircle2, AlertTriangle, Clock, Map, TrendingUp
} from 'lucide-react';
import SupplyOutlook from '../components/SupplyOutlook';

interface LogisticsProps {
    onCreatePackingList: () => void;
}

const Logistics = ({ onCreatePackingList }: LogisticsProps) => {
    const [activeTab, setActiveTab] = useState('shipments');

    const summaryStats = [
        {
            label: 'Weekly Volume',
            value: '18.5 Tons',
            icon: Scale,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20'
        },
        {
            label: 'Active Shipments',
            value: '3 En Route',
            icon: Plane,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            label: 'Avg Handover Temp',
            value: '5.4°C',
            icon: Thermometer,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            label: 'Pending Docs',
            value: '2 Invoices',
            icon: FileText,
            color: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20'
        }
    ];

    // Mock Data for Airport Shipments (Mirroring Excel)
    const shipments = [
        {
            id: 'SHP-001',
            date: '04/06/2025',
            client: 'MWW Experts',
            dest: 'UK',
            flight: 'RwandAir WB300',
            plRef: '81',
            invRef: '12568',
            boxes: 416,
            skids: 1,
            weightNet: 468,
            weightGross: 504,
            temp: 5.2,
            status: 'Departed',
            statusColor: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
        },
        {
            id: 'SHP-002',
            date: '01/09/2025',
            client: 'Nature Pride',
            dest: 'Turkey',
            flight: 'Turkish Air',
            plRef: '04',
            invRef: '12570',
            boxes: 156,
            skids: 1.5,
            weightNet: 210,
            weightGross: 245,
            temp: 6.5,
            status: 'Manifested',
            statusColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
        },
        {
            id: 'SHP-003',
            date: '05/09/2025',
            client: 'Carrefour Dubai',
            dest: 'UAE',
            flight: 'RwandAir WB305',
            plRef: '83',
            invRef: '12572',
            boxes: 320,
            skids: 2,
            weightNet: 390,
            weightGross: 430,
            temp: 8.5, // High Temp Alert
            status: 'Scheduled',
            statusColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
        }
    ];


    const docs = [
        {
            id: 'PL-081',
            client: 'MWW Experts',
            status: 'Pending',
            items: [
                { name: 'Invoice', status: 'ok' },
                { name: 'Packing List', status: 'ok' },
                { name: 'Euro 1 Cert', status: 'waiting' }
            ]
        },
        {
            id: 'PL-04',
            client: 'Nature Pride',
            status: 'Complete',
            items: [
                { name: 'Invoice', status: 'ok' },
                { name: 'Packing List', status: 'ok' },
                { name: 'Phyto Cert', status: 'ok' }
            ]
        }
    ];

    return (
        <div className="p-6 space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logistics & Documentation</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage shipments, flight schedules, and export compliance</p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap ml-auto justify-end">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Plane size={18} />
                            Export Schedule
                        </button>
                        <button
                            onClick={onCreatePackingList}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            Create Packing List
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryStats.map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <div className={`text-2xl font-bold mt-1 ${stat.color === 'text-orange-600' ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                                    {stat.value}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'shipments', label: 'Airport Shipments' },
                        { id: 'supply', label: 'Supply Forecasts' },
                        { id: 'docs', label: 'Documentation' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                                    ? 'border-green-600 text-green-600 dark:text-green-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">

                {/* TAB 1: AIRPORT SHIPMENTS (EXCEL VIEW) */}
                {activeTab === 'shipments' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <th className="px-6 py-4">Date / Flight</th>
                                    <th className="px-6 py-4">Client / Dest</th>
                                    <th className="px-6 py-4">Ref Numbers</th>
                                    <th className="px-6 py-4">Volume</th>
                                    <th className="px-6 py-4">Weight (Kg)</th>
                                    <th className="px-6 py-4">Handover Temp</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {shipments.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.date}</span>
                                                <span className="text-xs text-gray-500">{item.flight}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white block">{item.client}</span>
                                            <span className="text-xs text-gray-500">{item.dest}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-mono text-gray-600 dark:text-gray-300"><span className="text-gray-400">PL:</span> {item.plRef}</span>
                                                <span className="text-xs font-mono text-gray-600 dark:text-gray-300"><span className="text-gray-400">Inv:</span> {item.invRef}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white block">{item.boxes} Boxes</span>
                                            <span className="text-xs text-gray-500">{item.skids} Skids</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="block">{item.weightNet} Net</span>
                                            <span className="text-gray-400">{item.weightGross} Gross</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Thermometer size={14} className={item.temp > 8 ? 'text-orange-500' : 'text-blue-500'} />
                                                <span className={`text-sm font-bold ${item.temp > 8 ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {item.temp}°C
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.statusColor}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}


                {/* TAB 3: SUPPLY OUTLOOK */}
                {activeTab === 'supply' && (
                    <SupplyOutlook />
                )}

                {/* TAB 4: DOCUMENTATION */}
                {activeTab === 'docs' && (
                    <div className="space-y-4">
                        {docs.map((doc) => (
                            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{doc.client}</h3>
                                    <p className="text-sm text-gray-500 font-mono">PL-{doc.id.split('-')[1]}</p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {doc.items.map((item, idx) => (
                                        <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${item.status === 'ok' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800/50' :
                                            item.status === 'waiting' ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' :
                                                'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/50'
                                            }`}>
                                            {item.status === 'ok' ? <CheckCircle2 size={14} /> :
                                                item.status === 'waiting' ? <Clock size={14} /> :
                                                    <AlertTriangle size={14} />}
                                            {item.name}
                                        </div>
                                    ))}
                                </div>

                                <button className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-800">
                                    <FileText size={16} />
                                    Manage Docs
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Logistics;
