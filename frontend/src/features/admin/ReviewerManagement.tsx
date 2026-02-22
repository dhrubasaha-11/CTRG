/**
 * Reviewer Management Component for SRC Chair.
 * View and manage reviewer profiles and workloads.
 */
import React, { useState, useEffect } from 'react';
import { Users, Mail, BarChart3, CheckCircle, XCircle, AlertCircle, Edit2, ToggleLeft, ToggleRight, Plus, Upload, Send } from 'lucide-react';
import { reviewerApi, type Reviewer } from '../../services/api';
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
    const [addFormData, setAddFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: ''
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

    const filteredReviewers = reviewers.filter((r) => {
        if (filter === 'active') return r.is_active_reviewer;
        if (filter === 'available') return r.is_active_reviewer && r.can_accept_more;
        return true;
    });

    const handleToggleActive = async (reviewer: Reviewer) => {
        try {
            setSaving(true);
            await reviewerApi.update(reviewer.id, { is_active_reviewer: !reviewer.is_active_reviewer });
            setReviewers(prev => prev.map(r =>
                r.id === reviewer.id ? { ...r, is_active_reviewer: !r.is_active_reviewer } : r
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
                department: editingReviewer.department,
                area_of_expertise: editingReviewer.area_of_expertise,
                max_review_load: editingReviewer.max_review_load,
            });
            setReviewers(prev => prev.map(r =>
                r.id === editingReviewer.id ? { ...r, department: editingReviewer.department, area_of_expertise: editingReviewer.area_of_expertise, max_review_load: editingReviewer.max_review_load } : r
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
                role: 'Reviewer'
            }, localStorage.getItem('token') || '');

            // Refresh list
            await loadReviewers();
            setShowAddModal(false);
            setExcelFile(null);
            setAddFormData({
                first_name: '',
                last_name: '',
                email: '',
                password: '',
                confirm_password: ''
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

    const getWorkloadColor = (current: number, max: number) => {
        if (max <= 0) return 'text-gray-600';
        const ratio = current / max;
        if (ratio >= 1) return 'text-red-600';
        if (ratio >= 0.7) return 'text-yellow-600';
        return 'text-green-600';
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
                    <h1 className="text-2xl font-bold text-gray-900">Reviewer Management</h1>
                    <p className="text-gray-500 mt-1">Manage reviewer profiles and track workloads</p>
                </div>
                <div className="flex items-center space-x-3">
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
                            setShowAddModal(true);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Reviewer
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Reviewers</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{reviewers.length}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Reviewers</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                {reviewers.filter(r => r.is_active_reviewer).length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Available</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                                {reviewers.filter(r => r.can_accept_more).length}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <BarChart3 size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">At Capacity</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">
                                {reviewers.filter(r => r.is_active_reviewer && !r.can_accept_more).length}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <AlertCircle size={24} className="text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
                {(['all', 'active', 'available'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${filter === f
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reviewer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expertise
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Workload
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReviewers.map((reviewer) => (
                                <tr key={reviewer.id} className="hover:bg-gray-50">
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
                                                <div className="text-sm font-medium text-gray-900">{reviewer.user_name}</div>
                                                <div className="text-sm text-gray-500 flex items-center">
                                                    <Mail size={12} className="mr-1" />
                                                    {reviewer.user_email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{reviewer.department || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs truncate" title={reviewer.area_of_expertise}>
                                            {reviewer.area_of_expertise}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reviewer.is_active_reviewer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {reviewer.is_active_reviewer ? (
                                                <><CheckCircle size={12} className="mr-1" /> Active</>
                                            ) : (
                                                <><XCircle size={12} className="mr-1" /> Inactive</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-32">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className={`font-medium ${getWorkloadColor(reviewer.current_workload, reviewer.max_review_load)}`}>
                                                    {reviewer.current_workload} / {reviewer.max_review_load}
                                                </span>
                                                {reviewer.can_accept_more ? (
                                                    <span className="text-green-600">Available</span>
                                                ) : (
                                                    <span className="text-red-600">Full</span>
                                                )}
                                            </div>
                                            {getWorkloadBar(reviewer.current_workload, reviewer.max_review_load)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => setSelectedReviewer(reviewer)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => setEditingReviewer({ ...reviewer })}
                                            className="text-gray-600 hover:text-gray-900"
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
                                            className={`${reviewer.is_active_reviewer ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
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
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Edit Reviewer</h2>
                            <p className="text-sm text-gray-500">{editingReviewer.user_name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={editingReviewer.department || ''}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, department: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Area of Expertise</label>
                                <input
                                    type="text"
                                    value={editingReviewer.area_of_expertise}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, area_of_expertise: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Review Load</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editingReviewer.max_review_load}
                                    onChange={(e) => setEditingReviewer({ ...editingReviewer, max_review_load: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setEditingReviewer(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Add New Reviewer</h2>
                            <p className="text-sm text-gray-500">Create one reviewer manually or import many from Excel</p>
                        </div>
                        <div className="p-6 border-b border-gray-200 space-y-3 bg-gray-50">
                            <div className="text-sm font-medium text-gray-700">Bulk Import (.xlsx)</div>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-600"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">
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
                            <div className="text-sm font-medium text-gray-700">Manual Add</div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={addFormData.first_name}
                                        onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={addFormData.email}
                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={addFormData.password}
                                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
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
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Creating...' : 'Create Reviewer'}
                                </button>
                            </div>
                        </form>
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
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {selectedReviewer.user_name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="ml-4">
                                        <h2 className="text-xl font-semibold text-gray-900">{selectedReviewer.user_name}</h2>
                                        <p className="text-sm text-gray-500">{selectedReviewer.user_email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedReviewer(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    x
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Department</h3>
                                <p className="mt-1 text-gray-900">{selectedReviewer.department || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Area of Expertise</h3>
                                <p className="mt-1 text-gray-900">{selectedReviewer.area_of_expertise}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedReviewer.is_active_reviewer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedReviewer.is_active_reviewer ? 'Active Reviewer' : 'Inactive'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Availability</h3>
                                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedReviewer.can_accept_more ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {selectedReviewer.can_accept_more ? 'Can Accept Reviews' : 'At Capacity'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Current Workload</h3>
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        {getWorkloadBar(selectedReviewer.current_workload, selectedReviewer.max_review_load)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {selectedReviewer.current_workload} / {selectedReviewer.max_review_load}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setSelectedReviewer(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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


