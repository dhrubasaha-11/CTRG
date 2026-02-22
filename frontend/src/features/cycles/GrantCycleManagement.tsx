/**
 * Grant Cycle Management Component for SRC Chair.
 * Allows creating, editing, and managing grant cycles.
 */
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Users, CheckCircle } from 'lucide-react';
import { cycleApi, type GrantCycle } from '../../services/api';

interface CycleFormData {
    name: string;
    year: string;
    start_date: string;
    end_date: string;
    stage1_review_start_date: string;
    stage1_review_end_date: string;
    stage2_review_start_date: string;
    stage2_review_end_date: string;
    revision_window_days: number;
    acceptance_threshold: number;
    max_reviewers_per_proposal: number;
    is_active: boolean;
}

const initialFormData: CycleFormData = {
    name: '',
    year: '',
    start_date: '',
    end_date: '',
    stage1_review_start_date: '',
    stage1_review_end_date: '',
    stage2_review_start_date: '',
    stage2_review_end_date: '',
    revision_window_days: 7,
    acceptance_threshold: 70,
    max_reviewers_per_proposal: 2,
    is_active: true,
};

const GrantCycleManagement: React.FC = () => {
    const [cycles, setCycles] = useState<GrantCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CycleFormData>(initialFormData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCycles();
    }, []);

    const loadCycles = async () => {
        try {
            setLoading(true);
            const response = await cycleApi.getAll();
            setCycles(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load grant cycles. Please check your connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                stage1_review_start_date: formData.stage1_review_start_date || null,
                stage1_review_end_date: formData.stage1_review_end_date || null,
                stage2_review_start_date: formData.stage2_review_start_date || null,
                stage2_review_end_date: formData.stage2_review_end_date || null,
            } as unknown as Record<string, unknown>;

            if (editingId) {
                await cycleApi.update(editingId, payload);
            } else {
                await cycleApi.create(payload);
            }
            loadCycles();
            setShowForm(false);
            setFormData(initialFormData);
            setEditingId(null);
        } catch (err: any) {
            const data = err?.response?.data;
            const firstFieldError = data && typeof data === 'object'
                ? Object.values(data).flat().find(Boolean)
                : null;
            setError(typeof firstFieldError === 'string' ? firstFieldError : 'Failed to save grant cycle');
        }
    };

    const handleEdit = (cycle: GrantCycle) => {
        setFormData({
            name: cycle.name,
            year: String(cycle.year),
            start_date: cycle.start_date || '',
            end_date: cycle.end_date || '',
            stage1_review_start_date: cycle.stage1_review_start_date || '',
            stage1_review_end_date: cycle.stage1_review_end_date || '',
            stage2_review_start_date: cycle.stage2_review_start_date || '',
            stage2_review_end_date: cycle.stage2_review_end_date || '',
            revision_window_days: cycle.revision_window_days || 7,
            acceptance_threshold: cycle.acceptance_threshold || 70,
            max_reviewers_per_proposal: cycle.max_reviewers_per_proposal || 2,
            is_active: cycle.is_active,
        });
        setEditingId(cycle.id);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this grant cycle?')) {
            try {
                await cycleApi.delete(id);
                loadCycles();
            } catch {
                setError('Failed to delete grant cycle');
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Grant Cycle Management</h1>
                    <p className="text-gray-500 mt-1">Create and manage grant review cycles</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setFormData(initialFormData); }}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                >
                    <Plus size={18} className="mr-2" />
                    New Grant Cycle
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full min-w-[320px] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingId ? 'Edit Grant Cycle' : 'Create New Grant Cycle'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., Spring 2025 Grant Cycle"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., 2024-2025"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cycle End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Stage 1 Review Period</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage1_review_start_date}
                                            onChange={(e) => setFormData({ ...formData, stage1_review_start_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage1_review_end_date}
                                            onChange={(e) => setFormData({ ...formData, stage1_review_end_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Stage 2 Review Period</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage2_review_start_date}
                                            onChange={(e) => setFormData({ ...formData, stage2_review_start_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage2_review_end_date}
                                            onChange={(e) => setFormData({ ...formData, stage2_review_end_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Configuration</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Revision Window (days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={formData.revision_window_days}
                                            onChange={(e) => setFormData({ ...formData, revision_window_days: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Threshold (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.acceptance_threshold}
                                            onChange={(e) => setFormData({ ...formData, acceptance_threshold: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Reviewers</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="4"
                                            value={formData.max_reviewers_per_proposal}
                                            onChange={(e) => setFormData({ ...formData, max_reviewers_per_proposal: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                    Active Cycle (accepting submissions)
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingId(null); }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingId ? 'Update Cycle' : 'Create Cycle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cycles List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {cycles.map((cycle) => (
                        <div
                            key={cycle.id}
                            className={`bg-white rounded-xl shadow-sm border ${cycle.is_active ? 'border-green-200' : 'border-gray-200'} p-6 hover:shadow-md transition-shadow`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
                                        {cycle.is_active && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle size={12} className="mr-1" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">Academic Year: {cycle.year}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(cycle)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cycle.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar size={16} className="mr-2 text-gray-400" />
                                    <span>{cycle.start_date} - {cycle.end_date}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <Users size={16} className="mr-2 text-gray-400" />
                                    <span>{cycle.proposal_count || 0} Proposals</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">Threshold:</span> {cycle.acceptance_threshold}%
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">Revision:</span> {cycle.revision_window_days} days
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GrantCycleManagement;
