import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Pagination from '../../shared/component/Pagination';
import {
    Search, X, CheckCircle, XCircle, Inbox,
    Info, User, Clock, Send
} from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'new' | 'pending' | 'confirmed' | 'declined';

interface ClientRequest {
    id: string;
    sender: string;
    contact: string;
    contactRole: string;
    subject: string;
    previewText: string;
    fullMessage: string;
    systemContext: string;
    timestamp: string;
    status: RequestStatus;
    unread: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialRequests: ClientRequest[] = [
    {
        id: 'ORD-2401',
        sender: 'MWW Experts (UK)',
        contact: 'Sarah Jenkins',
        contactRole: 'Procurement Manager',
        subject: 'Request for Supplies: 500kg Fine Beans (Premium Grade)',
        previewText: 'Good day, We have an urgent requirement for 500kg of Fine Beans...',
        fullMessage:
            'Good day,\n\nWe have an urgent requirement for 500kg of Fine Beans (Premium Grade) to be shipped by Friday.\n\nCould you please confirm availability and provide a revised quotation at your earliest convenience? Our logistics team is on standby awaiting confirmation.\n\nKind regards,\nSarah Jenkins',
        systemContext:
            'System Check: 850kg of Fine Beans currently in Raw Intake (Batch GF-212). Stock is available to fulfil this order in full.',
        timestamp: 'Today, 10:30 AM',
        status: 'new',
        unread: true,
    },
    {
        id: 'ORD-2398',
        sender: 'Carrefour Dubai',
        contact: 'Ahmed Al-Rashidi',
        contactRole: 'Category Buyer',
        subject: 'Follow-up: Habanero Pricing & Availability — 200kg',
        previewText: "Hi, following up on last week's Habanero quotation. Can you provide updated pricing...",
        fullMessage:
            "Hi,\n\nFollowing up on last week's Habanero quotation. Can you provide the updated pricing for 200kg? This is for our weekly H&B category refresh and we need confirmation by end of day.\n\nThank you,\nAhmed",
        systemContext:
            'System Check: 310kg of Habanero (Grade A) available in Batch GF-211. Last quoted price: $4.80/kg. MRL compliance verified Jan 2026.',
        timestamp: 'Yesterday, 3:45 PM',
        status: 'pending',
        unread: false,
    },
    {
        id: 'ORD-2391',
        sender: 'Waitrose PLC',
        contact: 'Jennifer Clarke',
        contactRole: 'Category Manager',
        subject: 'Order Confirmed — 1,200kg Grade A Avocados',
        previewText: 'Confirmed receipt of the avocado shipment. Excellent quality as always. Thank you!',
        fullMessage:
            'Hi team,\n\nWe would like to place a standing order for 1,200kg of Grade A Avocados for our upcoming promotion week (w/c 24th Feb).\n\nPlease confirm allocation and advise on packing spec requirements.\n\nBest,\nJennifer Clarke',
        systemContext:
            'System Check: 1,500kg of Hass Avocados (Grade A) in stock — Batch AV-088. Dry matter confirmed at 24.1%. Cold chain maintained at 5.5°C.',
        timestamp: 'Feb 18, 9:15 AM',
        status: 'confirmed',
        unread: false,
    },
    {
        id: 'ORD-2385',
        sender: 'Aldi Süd (Germany)',
        contact: 'Klaus Hoffmann',
        contactRole: 'Buying Director',
        subject: 'Enquiry: Seasonal Avocados — Q1 Volume Contract',
        previewText: 'We are planning our Q1 avocado sourcing and would like to discuss volume...',
        fullMessage:
            'Dear Production Team,\n\nWe are planning our Q1 avocado sourcing calendar and would like to discuss a potential volume contract. Could you advise on available weekly tonnage, minimum order quantities, and your current certification status (GlobalG.A.P.)?\n\nMit freundlichen Grüßen,\nKlaus Hoffmann',
        systemContext:
            'System Check: Current weekly avocado output capacity is approx. 2,400kg. GlobalG.A.P. certification valid until Dec 2026.',
        timestamp: 'Feb 16, 11:00 AM',
        status: 'pending',
        unread: true,
    },
];

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RequestStatus, { label: string; pill: string; dot: string }> = {
    new: {
        label: 'New',
        pill: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        dot: 'bg-red-500',
    },
    pending: {
        label: 'Pending',
        pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    confirmed: {
        label: 'Confirmed',
        pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    declined: {
        label: 'Declined',
        pill: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
};



// ─── Request Detail Modal ─────────────────────────────────────────────────────

interface RequestDetailModalProps {
    request: ClientRequest;
    onClose: () => void;
    onConfirm: () => void;
    onDecline: () => void;
    onSendReply: (text: string) => void;
}

const RequestDetailModal = ({
    request,
    onClose,
    onConfirm,
    onDecline,
    onSendReply,
}: RequestDetailModalProps) => {
    const [replyText, setReplyText] = useState('');
    const cfg = STATUS_CONFIG[request.status];
    const isResolved = request.status === 'confirmed' || request.status === 'declined';

    const handleSend = () => {
        if (!replyText.trim()) return;
        onSendReply(replyText.trim());
        setReplyText('');
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Request Details
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{request.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* Section 1 — Client & Message */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                                    {request.sender.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {request.sender}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                        <User size={11} />
                                        {request.contact} · {request.contactRole}
                                    </div>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.pill}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                            </span>
                        </div>

                        {/* Subject */}
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                            {request.subject}
                        </p>

                        {/* Full message */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                                {request.fullMessage}
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                            <Clock size={11} />
                            {request.timestamp}
                        </div>
                    </div>

                    {/* Section 2 — System Context */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-4">
                            <div className="flex-shrink-0 mt-0.5 p-1.5 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                                <Info size={14} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
                                    System Context
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {request.systemContext}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 3 — Reply */}
                    <div className="px-6 py-4">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Your Reply / Notes
                        </label>
                        <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your reply or notes here..."
                            rows={3}
                            className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none transition"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Press{' '}
                            <kbd className="px-1 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded font-mono">
                                Ctrl+Enter
                            </kbd>{' '}
                            to send reply
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 flex-shrink-0">
                    {!isResolved ? (
                        <>
                            <button
                                onClick={onDecline}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700/50 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                <XCircle size={15} />
                                Decline
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!replyText.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send size={15} />
                                Send Reply
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-500/25 transition-all"
                            >
                                <CheckCircle size={15} />
                                Confirm &amp; Allocate Stock
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'new' | 'pending' | 'confirmed';

const ClientRequests = () => {
    const [requests, setRequests] = useState<ClientRequest[]>(initialRequests);
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
    const { showToast } = useToastContext();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const handleRowClick = (req: ClientRequest) => {
        setRequests(prev =>
            prev.map(r => (r.id === req.id ? { ...r, unread: false } : r))
        );
        setSelectedRequest({ ...req, unread: false });
    };

    const handleConfirm = () => {
        if (!selectedRequest) return;
        const updated: ClientRequest = { ...selectedRequest, status: 'confirmed' };
        setRequests(prev => prev.map(r => (r.id === selectedRequest.id ? updated : r)));
        setSelectedRequest(null);
        showToast("Order Confirmed", `${selectedRequest.id} confirmed — stock allocated!`);
    };

    const handleDecline = () => {
        if (!selectedRequest) return;
        const updated: ClientRequest = { ...selectedRequest, status: 'declined' };
        setRequests(prev => prev.map(r => (r.id === selectedRequest.id ? updated : r)));
        setSelectedRequest(null);
        showToast("Request Declined", `${selectedRequest.id} declined.`);
    };

    const handleSendReply = (text: string) => {
        if (!selectedRequest) return;
        const updated: ClientRequest = {
            ...selectedRequest,
            status: selectedRequest.status === 'new' ? 'pending' : selectedRequest.status,
            previewText: text,
        };
        setRequests(prev => prev.map(r => (r.id === selectedRequest.id ? updated : r)));
        setSelectedRequest(updated);
        showToast("Reply Sent", 'Reply sent successfully.');
    };

    const filterPills: { key: FilterKey; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'new', label: 'New' },
        { key: 'pending', label: 'Pending' },
        { key: 'confirmed', label: 'Confirmed' },
    ];

    const countOf = (k: FilterKey) =>
        k === 'all' ? requests.length : requests.filter(r => r.status === k).length;

    const filtered = requests.filter(r => {
        const matchesFilter = activeFilter === 'all' || r.status === activeFilter;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            !q ||
            r.sender.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            r.subject.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });

    const unreadCount = requests.filter(r => r.unread).length;

    return (
        <div className="p-6 pb-20 space-y-5">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Inbox size={22} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Client Orders &amp; Requests
                            {unreadCount > 0 && (
                                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Review and respond to incoming client orders
                        </p>
                    </div>
                </div>
            </div>

            {/* Toolbar: Search + Filter Pills */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by client, subject, or order #..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                    />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {filterPills.map(pill => (
                        <button
                            key={pill.key}
                            onClick={() => setActiveFilter(pill.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === pill.key
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {pill.label}
                            <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${activeFilter === pill.key
                                ? 'bg-white/25 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                }`}>
                                {countOf(pill.key)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Inbox Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* Table Header */}
                <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject / Preview</span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Date</span>
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <Inbox size={36} className="opacity-20" />
                        <p className="text-sm">No requests match your filter</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(req => {
                            const cfg = STATUS_CONFIG[req.status];
                            return (
                                <button
                                    key={req.id}
                                    onClick={() => handleRowClick(req)}
                                    className={`w-full text-left grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-6 py-4 transition-colors hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 focus:outline-none ${req.unread ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                        }`}
                                >
                                    {/* Client */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {req.unread && (
                                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                                        )}
                                        <div className={`min-w-0 ${!req.unread ? 'pl-4' : ''}`}>
                                            <p className={`text-sm truncate ${req.unread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                                                {req.sender}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{req.id}</p>
                                        </div>
                                    </div>

                                    {/* Subject + Preview */}
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <p className={`text-sm truncate ${req.unread ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal text-gray-700 dark:text-gray-300'}`}>
                                            {req.subject}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">{req.previewText}</p>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}>
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex items-center justify-end">
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{req.timestamp}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <RequestDetailModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onConfirm={handleConfirm}
                    onDecline={handleDecline}
                    onSendReply={handleSendReply}
                />
            )}

        </div>
    );
};

export default ClientRequests;
