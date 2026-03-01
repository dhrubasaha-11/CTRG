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

    const availableReviewers = reviewers.filter(r => r.is_active_reviewer && r.can_accept_more);
    const canAssignStage2 = ['REVISED_PROPOSAL_SUBMITTED', 'UNDER_STAGE_2_REVIEW'].includes(proposal.status);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
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

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                            <AlertCircle size={18} className="mr-2" />
                            {error}
                        </div>
                    )}

                    {/* Stage Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Review Stage</label>
                        <div className="flex space-x-4">
                            <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${stage === 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
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
                            <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${stage === 2 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Review Deadline</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Reviewer Selection */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Select Reviewers</label>
                            <span className="text-sm text-gray-500">
                                {selectedReviewers.length} selected
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                                {availableReviewers.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
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
                                                : 'hover:bg-gray-50 border-l-4 border-transparent'
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
                                                    <div className="font-medium text-gray-900">{reviewer.user_name}</div>
                                                    <div className="text-sm text-gray-500">{reviewer.area_of_expertise}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm text-gray-600">
                                                    {reviewer.current_workload}/{reviewer.max_review_load}
                                                </span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${(reviewer.current_workload / reviewer.max_review_load) * 100}%` }}
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
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                    {assignedIds.length > 0 ? (
                        <>
                            <span className="text-green-600 text-sm flex items-center mr-auto">
                                <Check size={16} className="mr-1" />
                                {assignedIds.length} reviewer(s) assigned successfully
                            </span>
                            <button
                                type="button"
                                onClick={onSuccess}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
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
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedReviewers.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
    );
};

export default ReviewerAssignmentModal;
