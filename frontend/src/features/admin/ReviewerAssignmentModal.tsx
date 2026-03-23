/**
 * Reviewer Assignment Modal Component.
 * Allows SRC Chair to assign reviewers to proposals.
 */
import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Users, Mail } from 'lucide-react';
import { reviewerApi, assignmentApi, type Proposal, type Reviewer } from '../../services/api';

interface Props {
    proposal: Proposal;
    onClose: () => void;
    onSuccess: () => void;
}

const ReviewerAssignmentModal: React.FC<Props> = ({ proposal, onClose, onSuccess }) => {
    const [reviewers, setReviewers] = useState<Reviewer[]>([]);
    const [selectedReviewers, setSelectedReviewers] = useState<number[]>([]);
    const [deadline, setDeadline] = useState('');
    const [stage, setStage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignedIds, setAssignedIds] = useState<number[]>([]);
    const [notifying, setNotifying] = useState(false);

    useEffect(() => {
        loadReviewers();
        // Set default deadline to 2 weeks from now
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 14);
        setDeadline(defaultDeadline.toISOString().split('T')[0] + 'T17:00');

        // Determine stage based on proposal status
        if (proposal.status === 'REVISED_PROPOSAL_SUBMITTED') {
            setStage(2);
        }
    }, [proposal]);

    const loadReviewers = async () => {
        try {
            setLoading(true);
            const response = await reviewerApi.getWorkloads();
            setReviewers(response.data);
            setError(null);
        } catch (err) {
            console.error("Failed to load reviewers", err);
            setError("Failed to load reviewers. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleReviewer = (userId: number) => {
        setSelectedReviewers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedReviewers.length === 0) {
            setError('Please select at least one reviewer');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const response = await assignmentApi.assignReviewers(proposal.id, selectedReviewers, stage, deadline);
            const assigned = response.data?.assigned || [];
            const newIds = assigned.map((a: any) => a.id);
            setAssignedIds(newIds);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to assign reviewers');
        } finally {
            setSubmitting(false);
        }
    };

    const handleNotifyAll = async () => {
        try {
            setNotifying(true);
            await assignmentApi.bulkNotify(assignedIds);
            alert(`Notification sent to ${assignedIds.length} reviewer(s).`);
            onSuccess();
        } catch {
            alert('Failed to send notifications.');
        } finally {
            setNotifying(false);
        }
    };

    const availableReviewers = reviewers.filter(r => r.is_active_reviewer);
    const canAssignStage2 = ['REVISED_PROPOSAL_SUBMITTED', 'UNDER_STAGE_2_REVIEW'].includes(proposal.status);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:px-6 sm:py-8">
            <div className="flex min-h-full items-start justify-center">
                <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl  shadow-2xl">
                {/* Header */}
                <div className="border-b  bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                        <div className="text-white">
                            <h2 className="text-xl font-semibold">Assign Reviewers</h2>
                            <p className="text-blue-100 text-sm mt-1">{proposal.proposal_code} - {proposal.title}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(100vh-13rem)] overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                            <AlertCircle size={18} className="mr-2" />
                            {error}
                        </div>
                    )}

                    {/* Stage Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Review Stage</label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${stage === 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:'}`}>
                                <input
                                    type="radio"
                                    name="stage"
                                    value="1"
                                    checked={stage === 1}
                                    onChange={() => setStage(1)}
                                    className="mr-2"
                                />
                                Stage 1 Review
                            </label>
                            <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${stage === 2 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:'}`}>
                                <input
                                    type="radio"
                                    name="stage"
                                    value="2"
                                    checked={stage === 2}
                                    disabled={!canAssignStage2}
                                    onChange={() => setStage(2)}
                                    className="mr-2"
                                />
                                Stage 2 Review
                            </label>
                        </div>
                        {!canAssignStage2 && (
                            <p className="mt-2 text-sm text-amber-700">
                                Stage 2 assignments are only available after a revised proposal is submitted.
                            </p>
                        )}
                    </div>

                    {/* Deadline */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Review Deadline</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    {/* Reviewer Selection */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-400">Select Reviewers</label>
                            <span className="text-sm text-slate-500">
                                {selectedReviewers.length} selected
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto border  rounded-lg">
                                {availableReviewers.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">
                                        <Users size={24} className="mx-auto mb-2 opacity-50" />
                                        No available reviewers
                                    </div>
                                ) : (
                                    availableReviewers.map((reviewer) => (
                                        <div
                                            key={reviewer.id}
                                            onClick={() => toggleReviewer(reviewer.user)}
                                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedReviewers.includes(reviewer.user)
                                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                                : 'hover: border-l-4 border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${selectedReviewers.includes(reviewer.user)
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {selectedReviewers.includes(reviewer.user) && (
                                                        <Check size={14} className="text-white" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200">{reviewer.user_name}</div>
                                                    <div className="text-sm text-slate-500">{reviewer.area_of_expertise || reviewer.department || 'No expertise added'}</div>
                                                    {reviewer.overload_warning && (
                                                        <div className="mt-1 text-xs font-medium text-amber-700">
                                                            {reviewer.overload_warning}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm text-slate-500">
                                                    {reviewer.current_workload}/{reviewer.max_review_load}
                                                </span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                                                    <div
                                                        className={`h-full rounded-full ${reviewer.can_accept_more ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min((reviewer.current_workload / reviewer.max_review_load) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-end gap-3 border-t   p-4 sm:p-6">
                    {assignedIds.length > 0 ? (
                        <>
                            <span className="mr-auto flex text-sm text-emerald-400">
                                <Check size={16} className="mr-1" />
                                {assignedIds.length} reviewer(s) assigned successfully
                            </span>
                            <button
                                type="button"
                                onClick={onSuccess}
                                className="px-4 py-2 border border-gray-300 text-slate-400 rounded-lg hover:bg-gray-100"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleNotifyAll}
                                disabled={notifying}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center"
                            >
                                {notifying ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} className="mr-2" />
                                        Send Email Notification
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 text-slate-400 rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedReviewers.length === 0}
                                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <Users size={16} className="mr-2" />
                                        Assign {selectedReviewers.length} Reviewer{selectedReviewers.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default ReviewerAssignmentModal;
