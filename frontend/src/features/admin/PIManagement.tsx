/**
 * PI Management Component for SRC Chair.
 * Create, view, and manage Principal Investigator accounts.
 */
import React, { useState, useEffect } from 'react';
import {
    UserPlus, Mail, CheckCircle, XCircle, AlertCircle,
    Search, RefreshCw, ToggleLeft, ToggleRight, Trash2, Eye, EyeOff,
    UserCheck, UserX, GraduationCap, Calendar,
} from 'lucide-react';
import { userApi, type PIUser, type CreatePIData } from '../../services/api';

const PIManagement: React.FC = () => {
    const [pis, setPIs] = useState<PIUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    const emptyForm = {
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        loadPIs();
    }, []);

    const loadPIs = async () => {
        try {
            setLoading(true);
            setPageError(null);
            const res = await userApi.listByRole('PI');
            setPIs(res.data.results ?? []);
        } catch {
            setPageError('Failed to load PI accounts. Please try again.');
            setPIs([]);
        } finally {
            setLoading(false);
        }
    };

    const generateUsername = (email: string) =>
        email.split('@')[0].trim().toLowerCase().replace(/[^a-z0-9.]/g, '.') || 'pi';

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        if (!form.first_name.trim() || !form.last_name.trim()) {
            setFormError('First and last name are required.');
            return;
        }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setFormError('A valid email address is required.');
            return;
        }
        if (form.password.length < 8) {
            setFormError('Password must be at least 8 characters.');
            return;
        }
        if (form.password !== form.confirm_password) {
            setFormError('Passwords do not match.');
            return;
        }

        setSaving(true);
        try {
            const payload: CreatePIData = {
                username: generateUsername(form.email),
                email: form.email.trim(),
                password: form.password,
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                role: 'PI',
            };
            await userApi.create(payload);
            setFormSuccess(`PI account created for ${form.first_name} ${form.last_name}.`);
            setForm(emptyForm);
            await loadPIs();
            setTimeout(() => {
                setShowAddModal(false);
                setFormSuccess(null);
            }, 1800);
        } catch (err: unknown) {
            const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
            if (data) {
                const msg = Object.values(data).flat().join(' ');
                setFormError(msg || 'Failed to create PI account.');
            } else {
                setFormError('Failed to create PI account. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (pi: PIUser) => {
        setTogglingId(pi.id);
        try {
            await userApi.toggleActive(pi.id, !pi.is_active);
            setPIs(prev =>
                prev.map(p => p.id === pi.id ? { ...p, is_active: !p.is_active } : p)
            );
        } catch {
            setPageError('Failed to update account status.');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await userApi.delete(id);
            setPIs(prev => prev.filter(p => p.id !== id));
            setConfirmDeleteId(null);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setPageError(msg || 'Failed to delete account.');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredPIs = pis.filter(pi => {
        const matchesSearch =
            pi.first_name.toLowerCase().includes(search.toLowerCase()) ||
            pi.last_name.toLowerCase().includes(search.toLowerCase()) ||
            pi.email.toLowerCase().includes(search.toLowerCase()) ||
            pi.username.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
            filter === 'all' ||
            (filter === 'active' && pi.is_active) ||
            (filter === 'inactive' && !pi.is_active);
        return matchesSearch && matchesFilter;
    });

    const totalActive = pis.filter(p => p.is_active).length;
    const totalInactive = pis.filter(p => !p.is_active).length;

    return (
        <div className="dashboard-theme space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">PI Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage Principal Investigator accounts for the CTRG grant system.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadPIs}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => { setShowAddModal(true); setFormError(null); setFormSuccess(null); setForm(emptyForm); }}
                        className="flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#1e2a4a_0%,#2a3a5f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                    >
                        <UserPlus size={15} />
                        Add PI Account
                    </button>
                </div>
            </div>

            {/* Page-level error */}
            {pageError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={15} />
                    {pageError}
                    <button onClick={() => setPageError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: 'Total PIs', value: pis.length, icon: GraduationCap, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                    { label: 'Active', value: totalActive, icon: UserCheck, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
                    { label: 'Inactive', value: totalInactive, icon: UserX, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
                ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                            <p className="mt-1 text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ background: stat.bg }}>
                            <stat.icon size={24} style={{ color: stat.color }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email or username..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-medium capitalize transition ${
                                filter === f
                                    ? 'bg-[#1e2a4a] text-white'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                        <span className="ml-3 text-sm text-slate-500">Loading PI accounts...</span>
                    </div>
                ) : filteredPIs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <GraduationCap size={40} className="mb-3 opacity-40" />
                        <p className="text-sm font-medium">
                            {pis.length === 0 ? 'No PI accounts yet.' : 'No accounts match your search.'}
                        </p>
                        {pis.length === 0 && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-3 text-sm text-indigo-600 hover:underline"
                            >
                                Add the first PI account
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Username</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPIs.map(pi => (
                                <tr key={pi.id} className="transition hover:bg-slate-50/60">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                                {pi.first_name?.[0]?.toUpperCase() || '?'}{pi.last_name?.[0]?.toUpperCase() || ''}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {pi.first_name} {pi.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Mail size={13} className="text-slate-400" />
                                            {pi.email}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                            {pi.username}
                                        </code>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar size={12} />
                                            {new Date(pi.date_joined).toLocaleDateString('en-US', {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            pi.is_active
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {pi.is_active
                                                ? <><CheckCircle size={11} /> Active</>
                                                : <><XCircle size={11} /> Inactive</>
                                            }
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Toggle active */}
                                            <button
                                                onClick={() => handleToggleActive(pi)}
                                                disabled={togglingId === pi.id}
                                                title={pi.is_active ? 'Deactivate account' : 'Activate account'}
                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                                    pi.is_active
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {togglingId === pi.id ? (
                                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                                                ) : pi.is_active ? (
                                                    <><ToggleRight size={14} /> Deactivate</>
                                                ) : (
                                                    <><ToggleLeft size={14} /> Activate</>
                                                )}
                                            </button>

                                            {/* Delete */}
                                            {confirmDeleteId === pi.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(pi.id)}
                                                        disabled={deletingId === pi.id}
                                                        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                                    >
                                                        {deletingId === pi.id ? 'Removing...' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(pi.id)}
                                                    title="Remove account"
                                                    className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                                >
                                                    <Trash2 size={13} />
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer count */}
            {!loading && filteredPIs.length > 0 && (
                <p className="text-right text-xs text-slate-400">
                    Showing {filteredPIs.length} of {pis.length} PI account{pis.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* ─── Add PI Modal ─── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        {/* Close */}
                        <button
                            onClick={() => { setShowAddModal(false); setFormError(null); setFormSuccess(null); }}
                            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            ✕
                        </button>

                        {/* Header */}
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                                <UserPlus size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Add PI Account</h2>
                                <p className="text-xs text-slate-500">Create a new Principal Investigator login</p>
                            </div>
                        </div>

                        {/* Success banner */}
                        {formSuccess && (
                            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle size={15} />
                                {formSuccess}
                            </div>
                        )}

                        {/* Error banner */}
                        {formError && (
                            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle size={15} />
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">First Name *</label>
                                    <input
                                        type="text"
                                        value={form.first_name}
                                        onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                                        placeholder="Jane"
                                        required
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">Last Name *</label>
                                    <input
                                        type="text"
                                        value={form.last_name}
                                        onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                                        placeholder="Smith"
                                        required
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Email Address *</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="jane.smith@nsu.edu"
                                        required
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                                {form.email && (
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Username will be: <code className="rounded bg-slate-100 px-1 text-slate-600">{generateUsername(form.email)}</code>
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="Minimum 8 characters"
                                        required
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={form.confirm_password}
                                        onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                                        placeholder="Repeat password"
                                        required
                                        className={`w-full rounded-lg border bg-slate-50 py-2 pl-3 pr-9 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                                            form.confirm_password && form.password !== form.confirm_password
                                                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                                : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                                        } focus:bg-white`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(v => !v)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {form.confirm_password && form.password !== form.confirm_password && (
                                    <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setFormError(null); setFormSuccess(null); }}
                                    className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#1e2a4a_0%,#3b4f80_100%)] py-2 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-60"
                                >
                                    {saving ? (
                                        <>
                                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={14} />
                                            Create PI Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PIManagement;
