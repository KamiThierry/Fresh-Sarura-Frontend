import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileText, Download, Globe, ShieldCheck, BookOpen } from 'lucide-react';

interface StandardsLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StandardsLibraryModal = ({ isOpen, onClose }: StandardsLibraryModalProps) => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const standards = [
        { id: 'STD-001', title: 'EU MRL Database 2024', category: 'eu', type: 'Regulation', update: 'Jan 15, 2024' },
        { id: 'STD-002', title: 'GlobalG.A.P. IFA v6', category: 'global', type: 'Standard', update: 'Nov 20, 2023' },
        { id: 'STD-003', title: 'USDA Organic Standards', category: 'us', type: 'Standard', update: 'Dec 05, 2023' },
        { id: 'STD-004', title: 'Carrefour QC Specs - Avocados', category: 'retailer', type: 'Spec Sheet', update: 'Feb 02, 2024' },
        { id: 'STD-005', title: 'Tesco Nurture Protocol', category: 'retailer', type: 'Protocol', update: 'Oct 10, 2023' },
    ];

    const downloads = [
        { name: 'Export Compliance Handbook 2024', size: '4.2 MB' },
        { name: 'Pesticide Application Log Template', size: '1.1 MB' },
        { name: 'Traceability Labeling Guidelines', size: '850 KB' },
    ];

    const filteredStandards = standards.filter(s =>
        (activeTab === 'all' || s.category === activeTab || (activeTab === 'retailer' && ['retailer'].includes(s.category))) &&
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="text-blue-600" size={24} />
                            Standards Library
                        </h2>
                        <p className="text-xs text-gray-500">Access compliance docs & export specifications</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search standards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            {['all', 'eu', 'us', 'retailer'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${activeTab === tab
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {tab === 'retailer' ? 'Retailer Specs' : tab.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="grid gap-3">
                        {filteredStandards.map((std) => (
                            <div key={std.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-lg ${std.category === 'eu' ? 'bg-blue-50 text-blue-600' :
                                        std.category === 'us' ? 'bg-red-50 text-red-600' :
                                            std.category === 'retailer' ? 'bg-purple-50 text-purple-600' :
                                                'bg-green-50 text-green-600'
                                        }`}>
                                        {std.category === 'eu' ? <Globe size={20} /> :
                                            std.category === 'global' ? <Globe size={20} /> :
                                                <ShieldCheck size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            {std.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                {std.type}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Updated: {std.update}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Download size={20} />
                                </button>
                            </div>
                        ))}

                        {filteredStandards.length === 0 && (
                            <div className="text-center py-12 text-gray-400 text-sm">
                                <Search size={48} className="mx-auto mb-3 opacity-20" />
                                No standards found for this filter.
                            </div>
                        )}
                    </div>

                    {/* Resources Section */}
                    <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 rounded-xl">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Downloadable Resources</h3>
                        <div className="space-y-3">
                            {downloads.map((doc, idx) => (
                                <button key={idx} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all group shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-500 group-hover:text-blue-600 group-hover:scale-110 transition-transform">
                                            <FileText size={18} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-700">{doc.name}</span>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{doc.size}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>,
        document.body
    );
};

export default StandardsLibraryModal;
