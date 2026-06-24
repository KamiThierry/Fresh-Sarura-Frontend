import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Send, Trash2, Check, Loader2, Lock, Mail } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToastContext } from '@/context/ToastContext';

interface ContactMessage {
    _id: string;
    name: string;
    email: string;
    type: string;
    message: string;
    status: 'Unread' | 'Read' | 'Replied';
    repliedAt?: string;
    replyNote?: string;
    createdAt: string;
}

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const avatarColors = [
    'bg-indigo-600', 'bg-violet-600', 'bg-blue-600', 'bg-teal-600',
    'bg-rose-600', 'bg-orange-500', 'bg-emerald-600', 'bg-pink-600',
];

const getAvatarColor = (name: string) =>
    avatarColors[name.charCodeAt(0) % avatarColors.length];

const Messages = () => {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ContactMessage | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [tab, setTab] = useState<'All' | 'Unread'>('All');
    const [search, setSearch] = useState('');
    const { showToast } = useToastContext();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/contact');
            setMessages(res.data || []);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(); }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selected]);

    const handleSelect = async (msg: ContactMessage) => {
        setSelected(msg);
        setReplyText('');
        if (msg.status === 'Unread') {
            try {
                await api.patch(`/contact/${msg._id}/read`, {});
                setMessages(prev =>
                    prev.map(m => m._id === msg._id ? { ...m, status: 'Read' } : m)
                );
            } catch {}
        }
    };

    const handleReply = async () => {
        if (!selected || !replyText.trim()) return;
        setSending(true);
        try {
            await api.post(`/contact/${selected._id}/reply`, { replyNote: replyText });
            const now = new Date().toISOString();
            setMessages(prev =>
                prev.map(m => m._id === selected._id
                    ? { ...m, status: 'Replied', replyNote: replyText, repliedAt: now }
                    : m
                )
            );
            setSelected(prev => prev ? { ...prev, status: 'Replied', replyNote: replyText, repliedAt: now } : null);
            setReplyText('');
            showToast('Reply Sent', 'Your message has been sent to the contact.');
        } catch {
            showToast('Error', 'Failed to send reply. Check your email configuration.');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/contact/${id}`);
            setMessages(prev => prev.filter(m => m._id !== id));
            if (selected?._id === id) setSelected(null);
            showToast('Message Deleted');
        } catch {
            showToast('Error', 'Failed to delete message.');
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await api.patch(`/contact/${id}/read`, {});
            setMessages(prev =>
                prev.map(m => m._id === id ? { ...m, status: 'Read' } : m)
            );
            if (selected?._id === id) {
                setSelected(prev => prev ? { ...prev, status: 'Read' } : null);
            }
            showToast('Status Updated', 'Message marked as read.');
        } catch {
            showToast('Error', 'Failed to mark as read.');
        }
    };

    const unreadCount = messages.filter(m => m.status === 'Unread').length;

    const filtered = messages.filter(m => {
        const matchTab = tab === 'All' || m.status === 'Unread';
        const matchSearch = !search || 
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase()) ||
            m.message.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">



            {/* Page header */}
            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Messages
                        {unreadCount > 0 && (
                            <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Inquiries from the FreshSarura landing page</p>
                </div>
                <button
                    onClick={fetchMessages}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Main split layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT: Inbox panel ── */}
                <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">

                    {/* Inbox heading + All/Unread tabs */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Inbox
                                {unreadCount > 0 && (
                                    <span className="ml-2 text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </h2>
                        </div>

                        {/* All / Unread tabs */}
                        <div className="flex gap-1">
                            {(['All', 'Unread'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-4 py-1 rounded-full text-sm font-semibold transition-all ${
                                        tab === t
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Message list */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                                <Loader2 size={16} className="animate-spin" /> Loading...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Mail size={32} className="mb-2 opacity-30" />
                                <p className="text-sm">No messages</p>
                            </div>
                        ) : filtered.map(msg => (
                            <button
                                key={msg._id}
                                onClick={() => handleSelect(msg)}
                                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                                    selected?._id === msg._id
                                        ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-600'
                                        : msg.status === 'Unread' ? 'bg-white dark:bg-gray-800' : ''
                                }`}
                            >
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(msg.name)}`}>
                                    {getInitials(msg.name)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-sm truncate ${msg.status === 'Unread' ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                            {msg.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatDate(msg.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{msg.message}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{msg.email}</p>
                                </div>

                                {/* Unread dot */}
                                {msg.status === 'Unread' && (
                                    <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0 mt-2" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Conversation panel ── */}
                <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">

                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                                <Mail size={36} className="opacity-40" />
                            </div>
                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">Select a message to read</p>
                            <p className="text-sm text-gray-400 mt-1">Choose from your inbox on the left</p>
                        </div>
                    ) : (
                        <>
                            {/* Conversation header */}
                            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(selected.name)}`}>
                                        {getInitials(selected.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{selected.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{selected.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Mark as read (tick) */}
                                    {selected.status !== 'Replied' && (
                                        <button
                                            title="Mark as read"
                                            onClick={() => handleMarkRead(selected._id)}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                        >
                                            <Check size={16} className={selected.status === 'Read' ? 'text-green-600' : ''} />
                                        </button>
                                    )}
                                    {/* Delete */}
                                    <button
                                        title="Delete message"
                                        onClick={e => handleDelete(selected._id, e)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Chat area */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

                                {/* Original message bubble — left aligned (from sender) */}
                                <div className="flex items-end gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(selected.name)}`}>
                                        {getInitials(selected.name)}
                                    </div>
                                    <div className="max-w-[70%]">
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                Original Inquiry
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                                                {selected.message}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                            {formatDateTime(selected.createdAt)}
                                            {' · '}
                                            <span className="capitalize">{selected.type}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Admin reply bubble — right aligned */}
                                {selected.status === 'Replied' && selected.replyNote && (
                                    <div className="flex items-end gap-3 justify-end">
                                        <div className="max-w-[70%]">
                                            <div className="bg-green-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                                                <p className="text-sm leading-relaxed whitespace-pre-line">
                                                    {selected.replyNote}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 text-right mr-1">
                                                {selected.repliedAt ? formatDateTime(selected.repliedAt) : ''}
                                                {' · You'}
                                            </p>
                                        </div>
                                        {/* Admin avatar placeholder */}
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            A
                                        </div>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>

                            {/* Reply bar — fixed at bottom */}
                            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                    rows={3}
                                    placeholder="Type your reply here..."
                                    className="w-full px-4 py-3 mb-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                        <Lock size={11} /> Secure TLS
                                    </span>
                                    <button
                                        onClick={handleReply}
                                        disabled={sending || !replyText.trim()}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                                            sending || !replyText.trim()
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 text-white active:scale-95 shadow-green-900/20'
                                        }`}
                                    >
                                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                        {sending ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
