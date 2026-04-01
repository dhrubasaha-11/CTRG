/**
 * Reviewer Management Component for SRC Chair.
 * View and manage reviewer profiles and workloads.
 */
import React, { useState, useEffect } from 'react';
import { Users, Mail, BarChart3, CheckCircle, XCircle, AlertCircle, Edit2, ToggleLeft, ToggleRight, Plus, Upload, Send, Download, UserPlus } from 'lucide-react';
import { reviewerApi, type Reviewer } from '../../services/api';
import api from '../../services/api';
import { register, importReviewersFromExcel } from '../../services/authService';
import EmailReviewersModal from './EmailReviewersModal';

const ReviewerManagement: React.FC = () => {
    const [reviewers, setReviewers] = useState<Reviewer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReviewer, setSelectedReviewer] = useState<Reviewer | null>(null);
    const [editingReviewer, setEditingReviewer] = useState<Reviewer | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'available'>('all');
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [importingExcel, setImportingExcel] = useState(false);
    const [selectedForEmail, setSelectedForEmail] = useState<Set<number>>(new Set());
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteExpiry, setInviteExpiry] = useState(7);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ message: string; registration_url: string; email_sent: boolean } | null>(null);
    const [addFormData, setAddFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        area_of_expertise: '',
        max_review_load: 5,
        password: '',
        confirm_password: '',
    });

    useEffect(() => {
        loadReviewers();
    }, []);

    const loadReviewers = async () => {
        try {
            setLoading(true);
            const response = await reviewerApi.getWorkloads();
            setReviewers(response.data);
        } catch (err) {
            console.error("Failed to load reviewers", err);
            setReviewers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteReviewer = async () => {
        const trimmed = inviteEmail.trim();
        if (!trimmed) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            alert('Please enter a valid email address.');
            return;
        }
        setInviting(true);
        setInviteResult(null);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/auth/invite-reviewer/', {
                email: inviteEmail.trim(),
                expires_in_days: inviteExpiry,
            }, {
                headers: { Authorization: `Token ${token}` },
            });
            setInviteResult(response.data);
            setInviteEmail('');
        } catch (err: any) {
            const msg = err.response?.data?.email?.[0] || err.response?.data?.detail || 'Failed to send invitation.';
            alert(msg);
        } finally {
            setInviting(false);
        }
    };

    const filteredReviewers = reviewers.filter((r) => {
        if (filter === 'active') return r.is_active_reviewer;
        if (filter === 'available') return r.is_active_reviewer && r.can_accept_more;
        return true;
    });

    const downloadBlob = (data: BlobPart, filename: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleToggleActive = async (reviewer: Reviewer) => {
        try {
            setSaving(true);
            const nextActive = !reviewer.is_active_reviewer;
            await reviewerApi.update(reviewer.id, {
                is_active_reviewer: nextActive,
                user_is_active: nextActive,
            });
            setReviewers(prev => prev.map(r =>
                r.id === reviewer.id ? { ...r, is_active_reviewer: nextActive, user_is_active: nextActive } : r
            ));
        } catch {
            alert('Failed to update reviewer status');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingReviewer) return;
        try {
            setSaving(true);
            await reviewerApi.update(editingReviewer.id, {
                first_name: editingReviewer.first_name,
                last_name: editingReviewer.last_name,
                email: editingReviewer.email,
                department: editingReviewer.department,
                area_of_expertise: editingReviewer.area_of_expertise,
                max_review_load: editingReviewer.max_review_load,
                user_is_active: editingReviewer.user_is_active,
                is_active_reviewer: editingReviewer.is_active_reviewer,
            });
            setReviewers(prev => prev.map(r =>
                r.id === editingReviewer.id ? {
                    ...r,
                    first_name: editingReviewer.first_name,
                    last_name: editingReviewer.last_name,
                    email: editingReviewer.email,
                    user_email: editingReviewer.email || editingReviewer.user_email,
                    user_name: `${editingReviewer.first_name || ''} ${editingReviewer.last_name || ''}`.trim() || editingReviewer.user_name,
                    department: editingReviewer.department,
                    area_of_expertise: editingReviewer.area_of_expertise,
                    max_review_load: editingReviewer.max_review_load,
                    user_is_active: editingReviewer.user_is_active,
                    is_active_reviewer: editingReviewer.is_active_reviewer,
                } : r
            ));
            setEditingReviewer(null);
            alert('Reviewer updated successfully');
        } catch {
            alert('Failed to update reviewer');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (addFormData.password !== addFormData.confirm_password) {
            alert("Passwords don't match");
            return;
        }
        try {
            setSaving(true);
            await register({
                username: addFormData.email.split('@')[0], // Generate username from email
                email: addFormData.email,
                password: addFormData.password,
                first_name: addFormData.first_name,
                last_name: addFormData.last_name,
                role: 'Reviewer',
                department: addFormData.department,
                area_of_expertise: addFormData.area_of_expertise,
                max_review_load: addFormData.max_review_load,
                is_active_reviewer: true,
            }, localStorage.getItem('token') || '');

            // Refresh list
            await loadReviewers();
            setShowAddModal(false);
            setExcelFile(null);
            setAddFormData({
                first_name: '',
                last_name: '',
                email: '',
                department: '',
                area_of_expertise: '',
                max_review_load: 5,
                password: '',
                confirm_password: '',
            });
            alert('Reviewer added successfully');
        } catch (err: any) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const messages = Object.entries(data)
                    .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                    .join('\n');
                alert(messages || 'Failed to add reviewer');
            } else {
                alert(err.message || 'Failed to add reviewer');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleExcelImport = async () => {
        if (!excelFile) {
            alert('Please choose an .xlsx file first.');
            return;
        }

        try {
            setImportingExcel(true);
            const token = localStorage.getItem('token') || '';
            const result = await importReviewersFromExcel(excelFile, token);
            await loadReviewers();

            const tempPasswords = result.created
                .filter(item => item.temporary_password)
                .map(item => `${item.email}: ${item.temporary_password}`)
                .join('\n');

            let message = `Imported ${result.created_count} reviewer(s).`;
            if (result.error_count > 0) {
                message += ` ${result.error_count} row(s) failed.`;
            }
            if (tempPasswords) {
                message += `\n\nTemporary passwords:\n${tempPasswords}`;
            }
            alert(message);
            setExcelFile(null);
        } catch (err: any) {
            const apiError = err?.response?.data?.error;
            alert(apiError || err.message || 'Failed to import reviewers from Excel');
        } finally {
            setImportingExcel(false);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const response = await reviewerApi.downloadWorkloadReport();
            downloadBlob(response.data, 'reviewer_workload_report.csv');
        } catch {
            alert('Failed to download reviewer status report.');
        }
    };

    const getWorkloadColor = (current: number, max: number) => {
        if (max <= 0) return 'text-slate-500';
        const ratio = current / max;
        if (ratio >= 1) return 'text-red-400';
        if (ratio >= 0.7) return 'text-amber-400';
        return 'text-emerald-600';
    };

    const getWorkloadBar = (current: number, max: number) => {
        const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
        const color = percentage >= 100 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500';
        return (
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Reviewer Management</h1>
                    <p className="text-slate-500 mt-1">Manage reviewer profiles and track workloads</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors"
                    >
                        <Download size={18} className="mr-2" />
                        Download Report
                    </button>
                    <button
                        onClick={() => setShowEmailModal(true)}
                        disabled={selectedForEmail.size === 0}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} className="mr-2" />
                        Email Selected ({selectedForEmail.size})
                    </button>
                    <button
                        onClick={() => {
                            setExcelFile(null);
                            setAddFormData({
                                first_name: '',
                                last_name: '',
                                email: '',
                                department: '',
                                area_of_expertise: '',
                                max_review_load: 5,
                                password: '',
                                confirm_password: '',
                            });
                            setShowAddModal(true);
                        }}
                        className="flex items-center btn btn-primary shadow-sm transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Reviewer
                    </button>
                    <button
                        onClick={() => {
                            setInviteEmail('');
                            setInviteExpiry(7);
                            setInviteResult(null);
                            setShowInviteModal(true);
                        }}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Invite Reviewer
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Reviewers</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{reviewers.length}</p>
                        </div>
                        <div className="p-3 rounded-lg" style={{background:"rgba(99,102,241,0.15)"}}>
                            <Users size={24} className="text-brand-400" />
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Reviewers</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">
                                {reviewers.filter(r => r.is_active_reviewer).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{background:"rgba(16,185,129,0.15)"}}>
                            <CheckCircle size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
                            <p className="text-2xl font-bold text-brand-400 mt-1">
                                {reviewers.reduce((sum, reviewer) => sum + (reviewer.pending || 0), 0)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{background:"rgba(99,102,241,0.15)"}}>
                            <BarChart3 size={24} className="text-brand-400" />
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Completed Reviews</p>
                            <p className="text-2xl font-bold text-amber-400 mt-1">
                                {reviewers.reduce((sum, reviewer) => sum + (reviewer.completed || 0), 0)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{background:"rgba(245,158,11,0.15)"}}>
                            <AlertCircle size={24} className="text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b ">
                {(['all', 'active', 'available'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${filter === f
                            ? 'text-brand-400 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-400'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({
                            f === 'all' ? reviewers.length :
                                f === 'active' ? reviewers.filter(r => r.is_active_reviewer).length :
                                    reviewers.filter(r => r.can_accept_more).length
                        })
                    </button>
                ))}
            </div>

            {/* Reviewers List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="min-w-full divide-y ">
                        <thead className="">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={filteredReviewers.length > 0 && filteredReviewers.every(r => selectedForEmail.has(r.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedForEmail(new Set(filteredReviewers.map(r => r.id)));
                                            } else {
                                                setSelectedForEmail(new Set());
                                            }
                                        }}
                                        className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Reviewer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Expertise
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Counts
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Workload
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className=" divide-y ">
                            {filteredReviewers.map((reviewer) => (
                                <tr key={reviewer.id} className="hover:">
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedForEmail.has(reviewer.id)}
                                            onChange={() => {
                                                setSelectedForEmail(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(reviewer.id)) {
                                                        next.delete(reviewer.id);
                                                    } else {
                                                        next.add(reviewer.id);
                                                    }
                                                    return next;
                                                });
                                            }}
                                            className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                {reviewer.user_name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-800">{reviewer.user_name}</div>
                                                <div className="text-sm text-slate-500 flex items-center">
                                                    <Mail size={12} className="mr-1" />
                                                    {reviewer.user_email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-800">{reviewer.department || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-800 max-w-xs truncate" title={reviewer.area_of_expertise}>
                                            {reviewer.area_of_expertise}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reviewer.is_active_reviewer ? 'badge-green' : 'bg-gray-100 text-slate-500'
                                            }`}>
                                            {reviewer.is_active_reviewer ? (
                                                <><CheckCircle size={12} className="mr-1" /> Active</>
                                            ) : (
                                                <><XCircle size={12} className="mr-1" /> Inactive</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        <div>Total: <span className="font-medium text-slate-800">{reviewer.total || 0}</span></div>
                                        <div>Pending: <span className="font-medium text-blue-700">{reviewer.pending || 0}</span></div>
                                        <div>Completed: <span className="font-medium text-green-700">{reviewer.completed || 0}</span></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-32">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className={`font-medium ${getWorkloadColor(reviewer.current_workload, reviewer.max_review_load)}`}>
                                                    {reviewer.current_workload} / {reviewer.max_review_load}
                                                </span>
                                                {reviewer.can_accept_more ? (
                                                    <span className="text-emerald-600">Available</span>
                                                ) : (
                                                    <span className="text-red-400">Full</span>
                                                )}
                                            </div>
                                            {getWorkloadBar(reviewer.current_workload, reviewer.max_review_load)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => setSelectedReviewer(reviewer)}
                                            className="text-brand-400 hover:text-blue-900"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => setEditingReviewer({ ...reviewer })}
                                            className="text-slate-500 hover:text-slate-800"
                                        >
                                            <Edit2 size={14} className="inline mr-1" />Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedForEmail(new Set([reviewer.id]));
                                                setShowEmailModal(true);
                                            }}
                                            className="text-emerald-600 hover:text-emerald-800"
                                            title="Send email"
                                        >
                                            <Mail size={14} className="inline mr-1" />Email
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(reviewer)}
                                            disabled={saving}
                                            className={`${reviewer.is_active_reviewer ? 'text-red-400 hover:text-red-800' : 'text-emerald-600 hover:text-green-800'}`}
                                            title={reviewer.is_active_reviewer ? 'Deactivate' : 'Activate'}
                                        >
                                            {reviewer.is_active_reviewer ? <ToggleRight size={18} className="inline" /> : <ToggleLeft size={18} className="inline" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Reviewer Modal */}
            {editingReviewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-[min(640px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">Edit Reviewer</h2>
                            <p className="text-sm text-slate-500">{editingReviewer.user_name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editingReviewer.first_name || ''}
                                        onChange={(e) => setEditingReviewer({ ...editingReviewer, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editingReviewer.last_name || ''}
                                        onChange={(e) => setEditingReviewer({ ...editingReviewer, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editingReviewer.email || editingReviewer.user_email}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={editingReviewer.department || ''}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, department: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Area of Expertise</label>
                                <input
                                    type="text"
                                    value={editingReviewer.area_of_expertise}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, area_of_expertise: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Max Review Load</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editingReviewer.max_review_load}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, max_review_load: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="flex items-center justify-between rounded-lg border  px-4 py-3">
                                    <span className="text-sm font-medium text-slate-400">Account Active</span>
                                    <input
                                        type="checkbox"
                                        checked={!!editingReviewer.user_is_active}
                                        onChange={(e) => setEditingReviewer({ ...editingReviewer, user_is_active: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-400"
                                    />
                                </label>
                                <label className="flex items-center justify-between rounded-lg border  px-4 py-3">
                                    <span className="text-sm font-medium text-slate-400">Reviewer Active</span>
                                    <input
                                        type="checkbox"
                                        checked={editingReviewer.is_active_reviewer}
                                        onChange={(e) => setEditingReviewer({ ...editingReviewer, is_active_reviewer: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-400"
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setEditingReviewer(null)}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="btn btn-primary disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Reviewer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-[min(960px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">Add New Reviewer</h2>
                            <p className="text-sm text-slate-500">Create one reviewer manually or import many from Excel</p>
                        </div>
                        <div className="p-6 border-b border-slate-200 space-y-3">
                            <div className="text-sm font-medium text-slate-400">Bulk Import (.xlsx)</div>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-slate-500">
                                    Columns: first_name, last_name, email, username(optional), password(optional)
                                </p>
                                <button
                                    type="button"
                                    onClick={handleExcelImport}
                                    disabled={importingExcel || !excelFile}
                                    className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Upload size={14} className="mr-2" />
                                    {importingExcel ? 'Importing...' : 'Import File'}
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div className="text-sm font-medium text-slate-400">Manual Add</div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={addFormData.first_name}
                                        onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={addFormData.last_name}
                                        onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={addFormData.email}
                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={addFormData.department}
                                    onChange={(e) => setAddFormData({ ...addFormData, department: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Area of Expertise</label>
                                <input
                                    type="text"
                                    value={addFormData.area_of_expertise}
                                    onChange={(e) => setAddFormData({ ...addFormData, area_of_expertise: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Max Review Load</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={addFormData.max_review_load}
                                    onChange={(e) => setAddFormData({ ...addFormData, max_review_load: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={addFormData.password}
                                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={addFormData.confirm_password}
                                    onChange={(e) => setAddFormData({ ...addFormData, confirm_password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExcelFile(null);
                                        setShowAddModal(false);
                                    }}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary disabled:opacity-50"
                                >
                                    {saving ? 'Creating...' : 'Create Reviewer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Invite Reviewer Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-[min(520px,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">Invite Reviewer</h2>
                            <p className="text-sm text-slate-500 mt-1">Send an invitation email with a registration link</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {inviteResult ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                        <p className="text-sm font-medium text-green-800">{inviteResult.message}</p>
                                        {!inviteResult.email_sent && (
                                            <p className="mt-2 text-xs text-amber-700">Email could not be sent. Share the registration link manually:</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Registration Link</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={inviteResult.registration_url}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm "
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(inviteResult.registration_url)
                                                        .then(() => alert('Link copied to clipboard!'))
                                                        .catch(() => alert('Failed to copy. Please select and copy the link manually.'));
                                                }}
                                                className="px-3 py-2 bg-gray-100 text-slate-400 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setInviteResult(null)}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                                        >
                                            Invite Another
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Reviewer Email</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="reviewer@nsu.edu"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Invitation Expires In (days)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={inviteExpiry}
                                            onChange={(e) => setInviteExpiry(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="pt-4 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleInviteReviewer}
                                            disabled={inviting || !inviteEmail.trim()}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {inviting ? 'Sending...' : 'Send Invitation'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Email Reviewers Modal */}
            {showEmailModal && (
                <EmailReviewersModal
                    reviewers={reviewers.filter(r => selectedForEmail.has(r.id))}
                    onClose={() => setShowEmailModal(false)}
                    onSuccess={() => {
                        setShowEmailModal(false);
                        setSelectedForEmail(new Set());
                    }}
                />
            )}

            {selectedReviewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-[min(760px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {selectedReviewer.user_name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="ml-4">
                                        <h2 className="text-xl font-semibold text-slate-800">{selectedReviewer.user_name}</h2>
                                        <p className="text-sm text-slate-500">{selectedReviewer.user_email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedReviewer(null)}
                                    className="text-slate-600 hover:text-slate-500"
                                >
                                    x
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500">Department</h3>
                                <p className="mt-1 text-slate-800">{selectedReviewer.department || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500">Area of Expertise</h3>
                                <p className="mt-1 text-slate-800">{selectedReviewer.area_of_expertise}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                        <h3 className="text-sm font-medium text-slate-500">Status</h3>
                                        <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedReviewer.is_active_reviewer ? 'badge-green' : 'bg-gray-100 text-slate-500'
                                        }`}>
                                        {selectedReviewer.is_active_reviewer ? 'Active Reviewer' : 'Inactive'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Account</h3>
                                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedReviewer.user_is_active ? 'badge-brand' : 'bg-gray-100 text-slate-400'}`}>
                                        {selectedReviewer.user_is_active ? 'Login Enabled' : 'Login Disabled'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Availability</h3>
                                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedReviewer.can_accept_more ? 'badge-brand' : 'badge-red'
                                        }`}>
                                        {selectedReviewer.can_accept_more ? 'Can Accept Reviews' : 'At Capacity'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Current Workload</h3>
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        {getWorkloadBar(selectedReviewer.current_workload, selectedReviewer.max_review_load)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-400">
                                        {selectedReviewer.current_workload} / {selectedReviewer.max_review_load}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Total Assignments</h3>
                                    <p className="mt-1 text-slate-800 font-semibold">{selectedReviewer.total || 0}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Pending Reviews</h3>
                                    <p className="mt-1 text-blue-700 font-semibold">{selectedReviewer.pending || 0}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Completed Reviews</h3>
                                    <p className="mt-1 text-green-700 font-semibold">{selectedReviewer.completed || 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t  flex justify-end">
                            <button
                                onClick={() => setSelectedReviewer(null)}
                                className="px-4 py-2 bg-gray-100 text-slate-400 rounded-lg hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewerManagement;


