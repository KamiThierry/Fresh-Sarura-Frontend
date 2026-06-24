import { useState, useEffect } from 'react';
import {
    Settings, User, Leaf, Save, Plus, Trash2,
    Loader2,
    Pencil, X, Tag, Calendar
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';

// ── Types ──────────────────────────────────────────────────────────
interface CropVariety {
    _id: string;
    name: string;
    category: string;
    seasons: string[];
    grades: string[];
    isActive: boolean;
}

type TabId = 'profile' | 'catalogue' | 'system';

const CATEGORIES = ['Vegetables', 'Fruits', 'Herbs', 'Other'];
const DEFAULT_GRADES = ['Grade A (Export)', 'Grade B (Local)', 'Grade C (Reject)'];
const COMMON_SEASONS = ['Jan-Mar', 'Mar-May', 'May-Jul', 'Jul-Sep', 'Sep-Nov', 'Nov-Jan', 'Year-round'];

const AdminSettings = () => {
    const { showToast } = useToastContext();
    const [activeTab, setActiveTab] = useState<TabId>('profile');

    // ── Profile state ──────────────────────────────────────────────
    const [profile, setProfile] = useState({ name: '', email: '' });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    // ── Catalogue state ────────────────────────────────────────────
    const [varieties, setVarieties] = useState<CropVariety[]>([]);
    const [catLoading, setCatLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);


    // New crop form
    const emptyForm = { name: '', category: 'Vegetables', seasons: [] as string[], grades: [...DEFAULT_GRADES] };
    const [newCrop, setNewCrop] = useState({ ...emptyForm });
    const [newGradeInput, setNewGradeInput] = useState('');
    const [newSeasonInput, setNewSeasonInput] = useState('');

    // Edit form
    const [editForm, setEditForm] = useState<Partial<CropVariety>>({});
    const [editGradeInput, setEditGradeInput] = useState('');

    // ── Load profile from localStorage ────────────────────────────
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                setProfile({ name: u.name || '', email: u.email || '' });
            } catch { }
        }
    }, []);

    // ── Load crop varieties ────────────────────────────────────────
    const fetchVarieties = async () => {
        setCatLoading(true);
        try {
            const res = await api.get('/crop-varieties/all');
            setVarieties(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch crop varieties', err);
        } finally {
            setCatLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'catalogue') fetchVarieties();
    }, [activeTab]);

    // ── Profile save ───────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (passwords.new && passwords.new !== passwords.confirm) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        setProfileLoading(true);
        try {
            const payload: any = { name: profile.name, email: profile.email };
            if (passwords.new) {
                payload.currentPassword = passwords.current;
                payload.newPassword = passwords.new;
            }
            const res = await api.patch('/auth/profile', payload);
            // Update localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                localStorage.setItem('user', JSON.stringify({ ...u, ...res.data.data }));
            }
            setPasswords({ current: '', new: '', confirm: '' });
            showToast('Profile updated successfully.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile.', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Add crop ───────────────────────────────────────────────────
    const handleAddCrop = async () => {
        if (!newCrop.name.trim()) {
            showToast('Crop name is required.', 'error');
            return;
        }
        setSavingId('new');
        try {
            await api.post('/crop-varieties', newCrop);
            setNewCrop({ ...emptyForm });
            setShowAddForm(false);
            showToast(`${newCrop.name} added to catalogue.`, 'success');
            fetchVarieties();
        } catch (err: any) {
            showToast(err.message || 'Failed to add crop.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    // ── Update crop ────────────────────────────────────────────────
    const handleUpdateCrop = async (id: string) => {
        setSavingId(id);
        try {
            await api.patch(`/crop-varieties/${id}`, editForm);
            setEditingId(null);
            showToast('Crop variety updated.', 'success');
            fetchVarieties();
        } catch (err: any) {
            showToast(err.message || 'Failed to update crop.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    // ── Deactivate crop ────────────────────────────────────────────
    const handleDeactivate = async (id: string, name: string) => {
        if (!confirm(`Deactivate "${name}"? It will be hidden from all dropdowns.`)) return;
        try {
            await api.delete(`/crop-varieties/${id}`);
            showToast(`${name} deactivated.`, 'success');
            fetchVarieties();
        } catch (err: any) {
            showToast(err.message || 'Failed to deactivate.', 'error');
        }
    };

    // ── Tag helpers ────────────────────────────────────────────────
    const addTag = (arr: string[], val: string, setArr: (v: string[]) => void, setInput: (v: string) => void) => {
        const trimmed = val.trim();
        if (trimmed && !arr.includes(trimmed)) setArr([...arr, trimmed]);
        setInput('');
    };
    const removeTag = (arr: string[], val: string, setArr: (v: string[]) => void) =>
        setArr(arr.filter(v => v !== val));

    const tabs: { id: TabId; label: string; icon: any }[] = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'catalogue', label: 'Crop Catalogue', icon: Leaf },
        { id: 'system', label: 'System Info', icon: Settings },
    ];

    return (
        <div className="p-6 space-y-5 animate-fade-in max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                    <Settings size={22} />
                </div>
                <div>
                    <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile and platform master data</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'border-green-500 text-green-600 dark:text-green-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ── TAB 1: PROFILE ── */}
            {activeTab === 'profile' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6 max-w-lg">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Account Information</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'admin@freshsarura.rw' },
                            ].map(f => (
                                <div key={f.key} className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={profile[f.key as keyof typeof profile]}
                                        onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Change Password</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Current Password', key: 'current', placeholder: '••••••••' },
                                { label: 'New Password', key: 'new', placeholder: 'Min 8 characters' },
                                { label: 'Confirm New Password', key: 'confirm', placeholder: 'Repeat new password' },
                            ].map(f => (
                                <div key={f.key} className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
                                    <input
                                        type="password"
                                        value={passwords[f.key as keyof typeof passwords]}
                                        onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        {profileLoading
                            ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                            : <><Save size={15} /> Save Profile</>
                        }
                    </button>
                </div>
            )}

            {/* ── TAB 2: CROP CATALOGUE ── */}
            {activeTab === 'catalogue' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Crop Catalogue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">These crops populate dropdowns across all portals</p>
                        </div>
                        <button
                            onClick={() => { setShowAddForm(true); setEditingId(null); }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            <Plus size={15} /> Add Crop
                        </button>
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                        <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">New Crop Variety</h3>
                                <button onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crop Name *</label>
                                    <input
                                        type="text"
                                        value={newCrop.name}
                                        onChange={e => setNewCrop(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. French Beans"
                                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                                    <select
                                        value={newCrop.category}
                                        onChange={e => setNewCrop(p => ({ ...p, category: e.target.value }))}
                                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30 appearance-none"
                                    >
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Seasons */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <Calendar size={11} /> Planting Seasons
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-1">
                                    {newCrop.seasons.map(s => (
                                        <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                            {s}
                                            <button onClick={() => removeTag(newCrop.seasons, s, v => setNewCrop(p => ({ ...p, seasons: v })))}>
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={newSeasonInput}
                                        onChange={e => setNewSeasonInput(e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none appearance-none"
                                    >
                                        <option value="">— Pick or type a season —</option>
                                        {COMMON_SEASONS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                    <button
                                        onClick={() => addTag(newCrop.seasons, newSeasonInput, v => setNewCrop(p => ({ ...p, seasons: v })), setNewSeasonInput)}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Grades */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    <Tag size={11} /> Export Grades
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-1">
                                    {newCrop.grades.map(g => (
                                        <span key={g} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                            {g}
                                            <button onClick={() => removeTag(newCrop.grades, g, v => setNewCrop(p => ({ ...p, grades: v })))}>
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newGradeInput}
                                        onChange={e => setNewGradeInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addTag(newCrop.grades, newGradeInput, v => setNewCrop(p => ({ ...p, grades: v })), setNewGradeInput)}
                                        placeholder="e.g. Grade A (Export)"
                                        className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none"
                                    />
                                    <button
                                        onClick={() => addTag(newCrop.grades, newGradeInput, v => setNewCrop(p => ({ ...p, grades: v })), setNewGradeInput)}
                                        className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAddCrop}
                                disabled={savingId === 'new'}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {savingId === 'new'
                                    ? <><Loader2 size={14} className="animate-spin" /> Adding...</>
                                    : <><Plus size={14} /> Add to Catalogue</>
                                }
                            </button>
                        </div>
                    )}

                    {/* Varieties list */}
                    {catLoading ? (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                            Loading catalogue...
                        </div>
                    ) : varieties.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-sm">
                            No crop varieties yet. Add your first one above.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {varieties.map(v => (
                                <div key={v._id} className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${!v.isActive ? 'opacity-50 border-gray-100 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700'
                                    }`}>
                                    {editingId === v._id ? (
                                        // ── Edit mode ──
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                                                    <input
                                                        value={editForm.name || ''}
                                                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                                                    <select
                                                        value={editForm.category || ''}
                                                        onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                                                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none appearance-none"
                                                    >
                                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Edit grades */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grades</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(editForm.grades || []).map(g => (
                                                        <span key={g} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 text-xs font-medium rounded-full">
                                                            {g}
                                                            <button onClick={() => setEditForm(p => ({ ...p, grades: (p.grades || []).filter(x => x !== g) }))}>
                                                                <X size={10} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={editGradeInput}
                                                        onChange={e => setEditGradeInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                addTag(editForm.grades || [], editGradeInput, v => setEditForm(p => ({ ...p, grades: v })), setEditGradeInput);
                                                            }
                                                        }}
                                                        placeholder="Add grade..."
                                                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => addTag(editForm.grades || [], editGradeInput, v => setEditForm(p => ({ ...p, grades: v })), setEditGradeInput)}
                                                        className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100"
                                                    >Add</button>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => handleUpdateCrop(v._id)}
                                                    disabled={savingId === v._id}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {savingId === v._id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // ── View mode ──
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{v.name}</span>
                                                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full font-medium">{v.category}</span>
                                                    {!v.isActive && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium">Inactive</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {v.seasons.map(s => (
                                                        <span key={s} className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">{s}</span>
                                                    ))}
                                                    {v.grades.map(g => (
                                                        <span key={g} className="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">{g}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => { setEditingId(v._id); setEditForm({ ...v }); setEditGradeInput(''); }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                {v.isActive && (
                                                    <button
                                                        onClick={() => handleDeactivate(v._id, v.name)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB 3: SYSTEM INFO ── */}
            {activeTab === 'system' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-lg space-y-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">System Information</h2>
                    {[
                        { label: 'Platform', value: 'Fresh Sarura - Export & Farmer Hub' },
                        { label: 'Version', value: 'v1.0.0' },
                        { label: 'Timezone', value: 'Africa/Kigali (UTC+2)' },
                        { label: 'Database', value: 'MongoDB Atlas (Cloud)' },
                        { label: 'Auth', value: 'JWT + bcryptjs' },

                    ].map(f => (
                        <div key={f.label} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{f.label}</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{f.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
