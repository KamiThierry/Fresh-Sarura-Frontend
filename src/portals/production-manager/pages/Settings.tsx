import { useState, useEffect } from 'react';
import {
    User, Mail, Shield, Save,
    Loader2, Phone, Eye, EyeOff
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';

const Settings = () => {
    const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [pwSaving, setPwSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const { showToast } = useToastContext();

    useEffect(() => {
        setProfileLoading(true);
        api.get('/auth/me')
            .then((res: any) => {
                const u = res.user ?? res.data?.user ?? {};
                setProfile({
                    name: u.name || '',
                    email: u.email || '',
                    phone: u.phone || '',
                });
                const stored = localStorage.getItem('user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('user', JSON.stringify({
                        ...parsed, name: u.name, email: u.email
                    }));
                }
            })
            .catch(() => {
                const stored = localStorage.getItem('user');
                if (stored) {
                    const u = JSON.parse(stored);
                    setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
                }
            })
            .finally(() => setProfileLoading(false));
    }, []);

    const handleSaveProfile = async () => {
        if (!profile.name.trim()) {
            showToast('Validation Error', 'Name cannot be empty.');
            return;
        }
        setProfileSaving(true);
        try {
            await api.patch('/auth/me', {
                name: profile.name,
                email: profile.email,
                phone: profile.phone
            });
            const stored = localStorage.getItem('user');
            if (stored) {
                localStorage.setItem('user', JSON.stringify({
                    ...JSON.parse(stored),
                    name: profile.name,
                    email: profile.email
                }));
            }
            showToast('Profile Updated', 'Your profile has been saved successfully.');
        } catch (err: any) {
            showToast('Update Failed', err?.response?.data?.message || 'Failed to save profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!pwForm.currentPassword) {
            showToast('Validation Error', 'Please enter your current password.');
            return;
        }
        if (pwForm.newPassword.length < 6) {
            showToast('Password Too Short', 'New password must be at least 6 characters.');
            return;
        }
        if (pwForm.newPassword !== pwForm.confirm) {
            showToast('Password Mismatch', 'New passwords do not match.');
            return;
        }
        setPwSaving(true);
        try {
            await api.patch('/auth/update-password', {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
            showToast('Password Changed', 'Your password has been updated successfully.');
        } catch (err: any) {
            showToast('Update Failed', err?.response?.data?.message || 'Incorrect current password.');
        } finally {
            setPwSaving(false);
        }
    };

    const initials = profile.name
        ? profile.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        : '—';

    return (
        <div className="flex flex-col items-center pb-20 animate-fade-in">

            {/* Page Header */}
            <div className="w-full max-w-3xl mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Settings & Preferences
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your profile and account security.
                    </p>
                </div>
            </div>

            <div className="w-full max-w-3xl space-y-6">

                {/* ── CARD 1: MY PROFILE ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User size={18} className="text-green-600" />
                            <h2 className="font-semibold text-gray-900 dark:text-white">My Profile</h2>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={profileSaving || profileLoading}
                            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:green-700 transition-colors disabled:opacity-60"
                        >
                            {profileSaving
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Save size={14} />
                            }
                            Save Changes
                        </button>
                    </div>

                    <div className="p-6">
                        {profileLoading ? (
                            <div className="flex items-center gap-3 text-gray-400">
                                <Loader2 size={20} className="animate-spin text-green-600" />
                                <span className="text-sm">Loading profile...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Avatar — display only, no upload */}
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-md border-4 border-white dark:border-gray-800">
                                        {initials}
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {profile.name || 'Your Name'}
                                    </span>
                                </div>

                                {/* Fields */}
                                <div className="flex-1 w-full space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Phone
                                        </label>
                                        <div className="relative">
                                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={profile.phone}
                                                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                                placeholder="+250 7XX XXX XXX"
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── CARD 2: CHANGE PASSWORD ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex items-center gap-2">
                        <Shield size={18} className="text-green-600" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">Change Password</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {([
                                { label: 'Current Password', key: 'currentPassword' },
                                { label: 'New Password',     key: 'newPassword' },
                                { label: 'Confirm New',      key: 'confirm' },
                            ] as const).map(({ label, key }) => (
                                <div key={key} className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {label}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            value={pwForm[key]}
                                            onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full pl-3 pr-9 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inline validation hints */}
                        {pwForm.newPassword && pwForm.newPassword.length < 6 && (
                            <p className="text-xs text-red-500 font-medium">
                                Password must be at least 6 characters.
                            </p>
                        )}
                        {pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
                            <p className="text-xs text-red-500 font-medium">
                                Passwords do not match.
                            </p>
                        )}
                        {pwForm.confirm && pwForm.newPassword === pwForm.confirm && pwForm.newPassword.length >= 6 && (
                            <p className="text-xs text-green-600 font-medium">
                                Passwords match.
                            </p>
                        )}

                        <button
                            onClick={handleChangePassword}
                            disabled={
                                pwSaving ||
                                !pwForm.currentPassword ||
                                !pwForm.newPassword ||
                                pwForm.newPassword !== pwForm.confirm ||
                                pwForm.newPassword.length < 6
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {pwSaving
                                ? <Loader2 size={15} className="animate-spin" />
                                : <Shield size={15} />
                            }
                            Update Password
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
