import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, Filter, Plus, Download, Printer, Eye, MoreVertical, CheckCircle, AlertCircle, Calendar, X, Loader2, ChevronDown } from 'lucide-react';
import DocumentUploadModal from '../components/DocumentUploadModal';
import Pagination from '../../shared/component/Pagination';
import { api } from '../../../lib/api';

const Documents = () => {
    const [searchParams] = useSearchParams();
    const initialShipmentId = searchParams.get('shipmentId');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterShipment, setFilterShipment] = useState(initialShipmentId || '');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [density] = useState<'comfortable' | 'compact'>('comfortable');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    const fetchDocuments = useCallback(async () => {
        setLoadingDocs(true);
        try {
            const res = await api.get('/export-documents');
            setDocuments(res.data || []);
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setLoadingDocs(false);
        }
    }, []);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    // Reset filter if URL param changes
    useEffect(() => {
        if (initialShipmentId) {
            setFilterShipment(initialShipmentId);
        }
    }, [initialShipmentId]);

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            const matchesSearch =
                doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.shipmentId?.plNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.docType?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'All' || doc.docType === filterType;
            const matchesShipment = !filterShipment ||
                doc.shipmentId?.plNumber === filterShipment ||
                doc.shipmentId === filterShipment ||
                (typeof doc.shipmentId === 'object' && doc.shipmentId?._id === filterShipment);
            return matchesSearch && matchesType && matchesShipment;
        });
    }, [documents, searchTerm, filterType, filterShipment]);

    // Reset to page 1 whenever filters change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterShipment]);

    const toggleSelection = (id: string) => {
        setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedDocs.length === filteredDocs.length && filteredDocs.length > 0) {
            setSelectedDocs([]);
        } else {
            setSelectedDocs(filteredDocs.map(d => d._id));
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Commercial Invoice': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Phytosanitary Cert': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Airway Bill': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="p-6 space-y-6 pb-20 relative">

            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Repository</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage all export documentation centrally.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} />
                    Upload New Document
                </button>
                </div>
            </div>
            </div>

            {/* Master Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {/* Unified Search & Filter Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by filename, client, or PL#..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Shipment Filter (Smart) */}
                        {filterShipment && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
                                <Filter size={14} />
                                PL: <strong>{filterShipment}</strong>
                                <button onClick={() => setFilterShipment('')} className="ml-1 hover:text-indigo-900 dark:hover:text-white"><X size={14} /></button>
                            </div>
                        )}

                        <div className="relative">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="All">All Types</option>
                                <option value="Commercial Invoice">Invoices</option>
                                <option value="Phytosanitary Cert">Phyto Certs</option>
                                <option value="Airway Bill">AWBs</option>
                                <option value="Packing List">Packing Lists</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedDocs.length === filteredDocs.length && filteredDocs.length > 0}
                                        onChange={toggleAll}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold">File Name</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Linked Shipment</th>
                                <th className="px-6 py-4 font-semibold">Uploaded By</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loadingDocs ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-gray-400">
                                            <Loader2 size={20} className="animate-spin" />
                                            <span className="text-sm">Loading documents...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDocs.length > 0 ? (
                                filteredDocs
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map(doc => (
                                        <tr
                                            key={doc._id}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group ${selectedDocs.includes(doc._id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                        >
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDocs.includes(doc._id)}
                                                    onChange={() => toggleSelection(doc._id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{doc.fileName}</div>
                                                        <div className="text-xs text-gray-500">{doc.docType}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${getTypeColor(doc.docType)}`}>
                                                    {doc.docType}
                                                </span>
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                {doc.shipmentId?.plNumber ? (
                                                    <button
                                                        onClick={() => setFilterShipment(doc.shipmentId.plNumber)}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs font-bold"
                                                    >
                                                        {doc.shipmentId.plNumber}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {doc.uploadedBy?.name || '—'}
                                                </span>
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    {new Date(doc.createdAt).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'}`}>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    doc.status === 'Verified'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    {doc.status === 'Verified' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 ${density === 'compact' ? 'py-2' : 'py-4'} text-right`}>
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            const w = window.open();
                                                            if (w && doc.fileUrl) {
                                                                w.document.write(`<iframe src="${doc.fileUrl}" style="width:100%;height:100vh;border:none;" />`);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!doc.fileUrl) return;
                                                            const a = document.createElement('a');
                                                            a.href = doc.fileUrl;
                                                            a.download = doc.fileName;
                                                            a.click();
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="More">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                                <Search size={32} />
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No documents found</h3>
                                            <p className="text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalItems={filteredDocs.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </div>

            {/* Bulk Action Bar (Floating Footer) */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${selectedDocs.length > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
                <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6 border border-gray-700">
                    <div className="flex items-center gap-3 pl-2 border-r border-gray-700 pr-6">
                        <span className="bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {selectedDocs.length}
                        </span>
                        <span className="font-medium text-sm">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium">
                            <Download size={16} /> Download Zip
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium">
                            <Printer size={16} /> Print Batch
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-900/50 text-red-300 rounded-lg transition-colors text-sm font-medium">
                            <X size={16} /> Delete
                        </button>
                    </div>
                    <button
                        onClick={() => setSelectedDocs([])}
                        className="ml-2 p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Upload Modal */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                preselectedShipmentId={filterShipment}
                onSuccess={() => { setIsUploadModalOpen(false); fetchDocuments(); }}
            />

        </div>
    );
};

export default Documents;
