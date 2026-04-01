/**
 * Grant Cycle Management Component for SRC Chair.
 * Allows creating, editing, and managing grant cycles.
 */
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Users, CheckCircle } from 'lucide-react';
import { cycleApi, type GrantCycle } from '../../services/api';

interface ScoreWeights {
    originality_score: number;
    clarity_score: number;
    literature_review_score: number;
    methodology_score: number;
    impact_score: number;
    publication_potential_score: number;
    budget_appropriateness_score: number;
    timeline_practicality_score: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
    originality_score: 15,
    clarity_score: 15,
    literature_review_score: 15,
    methodology_score: 15,
    impact_score: 15,
    publication_potential_score: 10,
    budget_appropriateness_score: 10,
    timeline_practicality_score: 5,
};

const WEIGHT_LABELS: Record<string, string> = {
    originality_score: 'Originality',
    clarity_score: 'Clarity',
    literature_review_score: 'Literature Review',
    methodology_score: 'Methodology',
    impact_score: 'Impact',
    publication_potential_score: 'Publication Potential',
    budget_appropriateness_score: 'Budget Appropriateness',
    timeline_practicality_score: 'Timeline Practicality',
};

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
    score_weights: ScoreWeights;
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
    score_weights: { ...DEFAULT_WEIGHTS },
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
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                stage1_review_start_date: formData.stage1_review_start_date || null,
                stage1_review_end_date: formData.stage1_review_end_date || null,
                stage2_review_start_date: formData.stage2_review_start_date || null,
                stage2_review_end_date: formData.stage2_review_end_date || null,
                score_weights: formData.score_weights,
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
            score_weights: (cycle.score_weights && Object.keys(cycle.score_weights).length > 0)
                ? { ...DEFAULT_WEIGHTS, ...cycle.score_weights } as ScoreWeights
                : { ...DEFAULT_WEIGHTS },
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
                    <h1 className="text-2xl font-bold text-slate-800">Grant Cycle Management</h1>
                    <p className="text-slate-500 mt-1">Create and manage grant review cycles</p>
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
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">
                                {editingId ? 'Edit Grant Cycle' : 'Create New Grant Cycle'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Cycle Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input"
                                        placeholder="e.g., Spring 2025 Grant Cycle"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Academic Year</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        className="input"
                                        placeholder="e.g., 2024-2025"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Cycle Start Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Cycle End Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-semibold text-slate-400 mb-3">Stage 1 Review Period</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage1_review_start_date}
                                            onChange={(e) => setFormData({ ...formData, stage1_review_start_date: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.stage1_review_end_date}
                                            onChange={(e) => setFormData({ ...formData, stage1_review_end_date: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-400 mb-3">Stage 2 Review Period</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.stage2_review_start_date}
                                            onChange={(e) => setFormData({ ...formData, stage2_review_start_date: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.stage2_review_end_date}
                                            onChange={(e) => setFormData({ ...formData, stage2_review_end_date: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-400 mb-3">Configuration</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Revision Window (days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={formData.revision_window_days}
                                            onChange={(e) => setFormData({ ...formData, revision_window_days: parseInt(e.target.value) })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Acceptance Threshold (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.acceptance_threshold}
                                            onChange={(e) => setFormData({ ...formData, acceptance_threshold: parseInt(e.target.value) })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Reviewers</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="4"
                                            value={formData.max_reviewers_per_proposal}
                                            onChange={(e) => setFormData({ ...formData, max_reviewers_per_proposal: parseInt(e.target.value) })}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Score Weights */}
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-400 mb-1">Score Weights</h3>
                                <p className="text-xs text-slate-500 mb-3">
                                    Customize max scores per criteria. Default total: 100.
                                    Current total: {Object.values(formData.score_weights).reduce((s, v) => s + v, 0)}
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(Object.keys(DEFAULT_WEIGHTS) as (keyof ScoreWeights)[]).map(key => (
                                        <div key={key}>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{WEIGHT_LABELS[key]}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={formData.score_weights[key]}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    score_weights: { ...formData.score_weights, [key]: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 text-brand-400 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_active" className="ml-2 text-sm text-slate-400">
                                    Active Cycle (accepting submissions)
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingId(null); }}
                                    className="px-4 py-2 border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
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
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {cycles.map((cycle) => (
                        <div
                            key={cycle.id}
                            className={`bg-white rounded-xl shadow-sm border ${cycle.is_active ? 'border-green-500/30' : 'border-slate-200'} p-6 hover:shadow-md transition-shadow`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-base font-semibold text-slate-800">{cycle.name}</h3>
                                        {cycle.is_active && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-green">
                                                <CheckCircle size={12} className="mr-1" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Academic Year: {cycle.year}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(cycle)}
                                        className="p-2 text-slate-500 hover:text-brand-400 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cycle.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center text-sm text-slate-500">
                                    <Calendar size={16} className="mr-2 text-slate-600" />
                                    <span>
                                        {cycle.start_date && cycle.end_date
                                            ? `${cycle.start_date} - ${cycle.end_date}`
                                            : `${cycle.stage2_review_start_date || 'TBD'} - ${cycle.stage2_review_end_date || 'TBD'}`}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm text-slate-500">
                                    <Users size={16} className="mr-2 text-slate-600" />
                                    <span>{cycle.proposal_count || 0} Proposals</span>
                                </div>
                                <div className="text-sm text-slate-500">
                                    <span className="font-medium">Threshold:</span> {cycle.acceptance_threshold}%
                                </div>
                                <div className="text-sm text-slate-500">
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
