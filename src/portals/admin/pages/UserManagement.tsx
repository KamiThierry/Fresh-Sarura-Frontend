import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, UserPlus, Edit2, PowerOff, Trash2, Filter, CheckCircle, ShieldOff, Clock, X, ChevronDown, Download, FileSpreadsheet, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AddUserModal from '../components/AddUserModal';
import { useToastContext } from '@/context/ToastContext';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logo from '@/assets/sarura_logo_nav.png';
import { getReportFooterText } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    production_manager: 'Production Manager',
    farm_manager: 'Farm Manager',
    logistic_officer: 'Logistics Officer',
    quality_officer: 'QC Officer',

};

const UserManagement = () => {
    const displayDate = (date: string | Date) => formatDate(date);
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [roleFilter, setRoleFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const { showToast } = useToastContext();
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<any | null>(null);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.newUser) {
            showToast("User Created Successfully", `${location.state.newUser} has been added to the system.`);
            // Clear the state so refreshing doesn't show the toast again
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate, location.pathname, showToast]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/auth/users');
            const data = res.data?.data ?? res?.data ?? res ?? [];
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const toggleActive = async (user: any) => {
        try {
            await api.patch(`/auth/users/${user._id}`, { isActive: !user.isActive });
            showToast('User Status Updated', `${user.name} is now ${!user.isActive ? 'Active' : 'Inactive'}.`);
            fetchUsers();
        } catch (err) { console.error('Failed to update user', err); }
    };

    const saveEdit = async () => {
        if (!editingUser) return;
        try {
            await api.patch(`/auth/users/${editingUser._id}`, {
                name: editingUser.name, email: editingUser.email, role: editingUser.role, phone: editingUser.phone,
            });
            showToast('User Profile Updated', `Changes for ${editingUser.name} have been saved.`);
            setEditingUser(null);
            fetchUsers();
        } catch (err) { console.error('Failed to save edit', err); }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        try {
            await api.delete(`/auth/users/${deletingUser._id}/permanent`);
            showToast('User Deleted', `The record for ${deletingUser.name} has been permanently removed.`);
            setDeletingUser(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to delete user', err);
        }
    };

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const makeSheet = (headers: string[], rows: (string | number)[][]) => {
            const data = [headers, ...rows];
            const ws   = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = headers.map((h, i) => {
                const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
                return { wch: Math.min(maxLen + 4, 40) };
            });
            return ws;
        };

        const userWs = makeSheet(
            ['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined'],
            filtered.map(u => [
                u.name  || 'N/A',
                u.email || 'N/A',
                (ROLE_LABELS[u.role] || u.role).replace(/_/g, ' '),
                String(u.phone || 'N/A'),
                u.isActive ? 'Active' : 'Inactive',
                formatDate(u.createdAt),
            ])
        );

        XLSX.utils.book_append_sheet(wb, userWs, 'Users');
        XLSX.writeFile(wb, `FreshSarura_UserManagement_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsExportOpen(false);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = formatDate(new Date());
        const toTitleCase = (str: string) =>
            str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // ── 1. Header ──
        try { doc.addImage(logo, 'PNG', 15, 12, 10, 10); } catch (e) { console.warn('Logo failed'); }
        doc.setTextColor(21, 128, 61); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Fresh Sarura', 28, 19);
        doc.setTextColor(107, 114, 128); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('Export & Farmer Hub', 28, 23);
        doc.setFontSize(10); doc.setTextColor(17, 24, 39);
        doc.text('Printed on', pageWidth - 15, 15, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
        doc.text(timestamp, pageWidth - 15, 20, { align: 'right' });
        doc.setDrawColor(229, 231, 235); doc.line(15, 30, pageWidth - 15, 30);

        // ── 2. Title ──
        doc.setTextColor(17, 24, 39); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`USER MANAGEMENT AUDIT REPORT`, 15, 42);

        // ── 3. Summary Fields ──
        const summaryFields = [
            { label: 'Total Accounts',    value: String(filtered.length) },
            { label: 'Active Personnel',  value: String(filtered.filter(u => u.isActive).length) },
            { label: 'Inactive / Pending', value: String(filtered.filter(u => !u.isActive).length) },
            { label: 'Privileged Admins',  value: String(filtered.filter(u => u.role === 'admin').length) },
        ];

        let yPos = 52;
        doc.setFontSize(9);
        summaryFields.forEach(field => {
            doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
            doc.text(field.label, 15, yPos);
            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold');
            doc.text(field.value, pageWidth - 15, yPos, { align: 'right' });
            doc.setDrawColor(243, 244, 246); doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
            yPos += 10;
        });

        // ── 4. Data Table ──
        const commonHeadStyles: any = { textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', fillColor: [92, 184, 92] };
        const commonBodyStyles: any = { fontSize: 8, textColor: [0, 0, 0], cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } };
        const alternateRowStyles: any = { fillColor: [249, 250, 251] };

        autoTable(doc, {
            startY: yPos + 10,
            head: [['NAME', 'EMAIL', 'ROLE', 'PHONE', 'STATUS', 'JOINED']],
            body: filtered.map(u => [
                toTitleCase(u.name), 
                u.email,
                toTitleCase(ROLE_LABELS[u.role] || u.role),
                u.phone || '—',
                u.isActive ? 'Active' : 'Inactive',
                formatDate(u.createdAt)
            ]),
            theme: 'striped', headStyles: commonHeadStyles, bodyStyles: commonBodyStyles, alternateRowStyles,
            margin: { left: 15, right: 15, bottom: 30 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    if (String(data.cell.raw) === 'Active') data.cell.styles.textColor = '#16a34a';
                    else data.cell.styles.textColor = '#dc2626';
                }
            }
        });

        // ── 5. System Insights ──
        let lastY = (doc as any).lastAutoTable?.finalY || yPos;
        if (lastY > 210) { doc.addPage(); lastY = 20; }
        
        doc.setTextColor(17, 24, 39); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('SYSTEM INSIGHTS', 15, lastY + 15);
        
        const activeRate = ((filtered.filter(u => u.isActive).length / (filtered.length || 1)) * 100).toFixed(1);
        doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal');
        doc.text(`• Account Health: ${activeRate}% of user accounts are currently active and authorized.`, 15, lastY + 23);
        doc.text(`• Access Control: There are ${filtered.filter(u => u.role === 'admin').length} administrator accounts with elevated system privileges.`, 15, lastY + 29);
        doc.text(`• Workforce Overview: The system currently manages ${filtered.length} personnel across ${new Set(filtered.map(u => u.role)).size} distinct roles.`, 15, lastY + 35);

        // ── 6. Footer ──
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(229, 231, 235); doc.line(15, 275, pageWidth - 15, 275);
            doc.setFontSize(8.5); doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'bold');
            doc.text(getReportFooterText(), pageWidth / 2, 280, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const footerY = 288;
            doc.text('Kigali - Rwanda | +250 780389786 | info@gardenfreshrwanda.com | www.gardenfreshrwanda.com', pageWidth / 2, footerY, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, footerY, { align: 'right' });
        }

        doc.save(`FreshSarura_UserManagement_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportOpen(false);
    };

    const filtered = users.filter(u => {
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = (u.name || '').toLowerCase().includes(searchLower) ||
            (u.email || '').toLowerCase().includes(searchLower) ||
            (ROLE_LABELS[u.role] || u.role || '').toLowerCase().includes(searchLower);
        const matchStatus = statusFilter === 'All' ||
            (statusFilter === 'Active' && u.isActive) ||
            (statusFilter === 'Inactive' && !u.isActive);
        const matchRole = roleFilter === 'All' || u.role === roleFilter;

        let matchDate = true;
        if (startDate || endDate) {
            const joinedDate = new Date(u.createdAt);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (joinedDate < start) matchDate = false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (joinedDate > end) matchDate = false;
            }
        }

        return matchSearch && matchStatus && matchRole && matchDate;
    });

    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const summaryStats = [
        { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Active Accounts', value: users.filter(u => u.isActive).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: 'Inactive', value: users.filter(u => !u.isActive).length, icon: ShieldOff, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">User Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage platform users and access</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
                        <Calendar size={15} className="text-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 font-medium">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400 font-medium ml-2">To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="text-sm text-gray-700 dark:text-white bg-transparent border-none outline-none cursor-pointer"
                        />
                    </div>
                    <button onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                    <button onClick={() => setIsAddUserOpen(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                        <UserPlus size={16} /> Add User
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {summaryStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={stat.color} size={22} /></div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Directory Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">

                {/* Unified Search & Filter Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search users, emails, roles..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition-all" />
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm">
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                    <div className="relative">
                        <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-8 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer shadow-sm">
                            <option value="All">All Roles</option>
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-16 text-center text-gray-400 text-sm">Loading users...</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                                {['User', 'Role', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {paginated.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm">No users found.</td></tr>
                            ) : paginated.map(u => {
                                const isCurrentUser = currentUser && (u._id === currentUser._id || u._id === currentUser.id);
                                return (
                                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                                                    {isCurrentUser && (
                                                        <span className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{ROLE_LABELS[u.role] || u.role}</td>
                                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">{u.phone || '—'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-gray-400">
                                        {displayDate(u.createdAt)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <button onClick={() => setEditingUser({ ...u })}
                                                className="p-1.5 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Edit">
                                                <Edit2 size={15} />
                                            </button>
                                            <button onClick={() => !isCurrentUser && toggleActive(u)}
                                                disabled={isCurrentUser}
                                                className={`p-1.5 rounded-lg transition-colors ${isCurrentUser ? 'opacity-30 cursor-not-allowed' : u.isActive ? 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                                title={isCurrentUser ? "You cannot deactivate your own account." : (u.isActive ? 'Deactivate' : 'Activate')}>
                                                <PowerOff size={15} />
                                            </button>
                                            <button onClick={() => !isCurrentUser && setDeletingUser(u)}
                                                disabled={isCurrentUser}
                                                className={`p-1.5 rounded-lg transition-colors ${isCurrentUser ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`} 
                                                title={isCurrentUser ? "You cannot delete your own account." : "Delete"}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Prev</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${p === currentPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{p}</button>
                            ))}
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>

            {/* Edit Modal */}
            {editingUser && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                    <Edit2 size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit User Profile</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Update account details and access level</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                                <input type="text" value={editingUser.name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all" />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                                <input type="email" value={editingUser.email || ''}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all" />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                                <input type="tel" value={editingUser.phone || ''}
                                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white transition-all" />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">System Role</label>
                                <div className="relative">
                                    <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full px-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white appearance-none transition-all">
                                        {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
                            <button onClick={() => setEditingUser(null)} 
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveEdit} 
                                className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingUser(null)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Are you sure you want to delete user <span className="font-bold text-gray-900 dark:text-white">"{deletingUser.name}"</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeletingUser(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onUserAdded={(name) => {
                    fetchUsers();
                    showToast("User Created Successfully", `${name} has been added to the system.`);
                }}
            />
        </div>
    );
};

export default UserManagement;
