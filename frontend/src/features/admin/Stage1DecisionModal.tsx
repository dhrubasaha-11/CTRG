/**
 * Stage 1 Decision Modal Component.
 * Allows SRC Chair to make Stage 1 decisions on proposals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, XCircle, AlertTriangle, FileText, ShieldCheck, Scale, MessageSquareQuote } from 'lucide-react';
import { assignmentApi, proposalApi, type Proposal, type ReviewAssignment } from '../../services/api';

interface Props {
    proposal: Proposal;
    onClose: () => void;
    onSuccess: () => void;
}

const Stage1DecisionModal: React.FC<Props> = ({ proposal, onClose, onSuccess }) => {
    const [decision, setDecision] = useState<'ACCEPT' | 'REJECT' | 'TENTATIVELY_ACCEPT' | ''>('');
    const [chairComments, setChairComments] = useState('');
    const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reviewActionId, setReviewActionId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadReviews = useCallback(async () => {
        try {
            setLoading(true);
            const response = await proposalApi.getReviews(proposal.id);
            setReviews(response.data.assignments || []);
            setError(null);
        } catch (err) {
            console.error("Failed to load reviews", err);
            setError("Failed to load reviews. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [proposal.id]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const stage1Assignments = reviews.filter((review) => review.stage === 1);
    const completedStage1Reviews = stage1Assignments.filter((review) => !!review.stage1_score);
    const includedStage1Reviews = completedStage1Reviews.filter(
        (review) => review.review_validity !== 'REJECTED'
    );
    const submittedCount = completedStage1Reviews.length;
    const assignedCount = stage1Assignments.length;
    const includedCount = includedStage1Reviews.length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!decision) {
            setError('Please select a decision');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await proposalApi.stage1Decision(proposal.id, decision, chairComments);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit decision');
        } finally {
            setSubmitting(false);
        }
    };

    const averageScore = includedStage1Reviews.length > 0
        ? Math.round(
            includedStage1Reviews.reduce(
                (sum, review) => sum + (review.stage1_score?.percentage_score || 0),
                0
            ) / includedStage1Reviews.length
        )
        : 0;

    const handleReviewValidity = async (review: ReviewAssignment, nextValidity: 'INCLUDED' | 'REJECTED') => {
        const reason = nextValidity === 'REJECTED'
            ? window.prompt(`Reason for rejecting ${review.reviewer_name}'s review:`, review.chair_rejection_reason || '')
            : '';

        if (nextValidity === 'REJECTED' && !reason?.trim()) {
            return;
        }

        try {
            setReviewActionId(review.id);
            setError(null);
            await assignmentApi.setReviewValidity(review.id, nextValidity, reason?.trim());
            await loadReviews();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update reviewer review status');
        } finally {
            setReviewActionId(null);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

    const scoreFields = [
        { key: 'originality_score', label: 'Originality', max: 15 },
        { key: 'clarity_score', label: 'Clarity', max: 15 },
        { key: 'literature_review_score', label: 'Literature Review', max: 15 },
        { key: 'methodology_score', label: 'Methodology', max: 15 },
        { key: 'impact_score', label: 'Impact', max: 15 },
        { key: 'publication_potential_score', label: 'Publication', max: 10 },
        { key: 'budget_appropriateness_score', label: 'Budget', max: 10 },
        { key: 'timeline_practicality_score', label: 'Timeline', max: 5 },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:px-6 sm:py-8">
            <div className="flex min-h-full items-start justify-center">
                <div className="my-auto w-full max-w-6xl overflow-hidden rounded-[28px] bg-[#f6f4ef] shadow-2xl">
                {/* Header */}
                <div className="border-b border-[#ddd7cb] bg-[linear-gradient(135deg,#1d2b45_0%,#2f466f_52%,#c8a44d_100%)] p-5 sm:p-7">
                    <div className="flex justify-between items-start gap-4">
                        <div className="text-white">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Editorial Review Board</p>
                            <h2 className="mt-2 font-serif text-3xl leading-tight">Stage 1 Editorial Decision</h2>
                            <p className="mt-3 max-w-3xl text-sm text-white/80">
                                {proposal.proposal_code} · {proposal.title}
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-full border border-white/20 /10 p-2 text-white/80 hover:/20 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                            <AlertCircle size={18} className="mr-2" />
                            {error}
                        </div>
                    )}

                    <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
                        <div className="rounded-[24px] border border-[#ddd7cb]  p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ead1] text-[#9a6c06]">
                                    <Scale size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Editorial Snapshot</p>
                                    <h3 className="font-serif text-2xl text-slate-900">Decision Basis</h3>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                <div className="rounded-2xl border border-[#e5dfd3] bg-[#fbfaf7] p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Score</p>
                                    <p className={`mt-2 text-4xl font-semibold ${getScoreColor(averageScore)}`}>{averageScore}%</p>
                                </div>
                                <div className="rounded-2xl border border-[#e5dfd3] bg-[#fbfaf7] p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reports Received</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{submittedCount}/{assignedCount}</p>
                                </div>
                                <div className="rounded-2xl border border-[#e5dfd3] bg-[#fbfaf7] p-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Included in Decision</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{includedCount}</p>
                                    <p className="mt-1 text-sm text-slate-500">Rejected reports are excluded from the average.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-[#ddd7cb]  p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8eef8] text-[#314c7d]">
                                    <MessageSquareQuote size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Peer Reports</p>
                                    <h3 className="font-serif text-2xl text-slate-900">Reviewer Assessments</h3>
                                </div>
                            </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#314c7d]"></div>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {completedStage1Reviews.map((review, idx) => (
                                    <div
                                        key={review.id}
                                        className={`rounded-[22px] border p-5 ${review.review_validity === 'REJECTED'
                                            ? 'border-red-200 bg-red-50/70'
                                            : 'border-[#e5dfd3] bg-[#fcfbf8]'
                                            }`}
                                    >
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <span className="text-sm font-medium text-slate-200">Reviewer {idx + 1}</span>
                                                <span className="ml-2 text-sm text-slate-500">({review.reviewer_name})</span>
                                                {review.review_validity_display && (
                                                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${review.review_validity === 'REJECTED'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {review.review_validity_display}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-2xl font-semibold ${getScoreColor(review.stage1_score?.percentage_score || 0)}`}>
                                                    {review.stage1_score?.percentage_score}%
                                                </span>
                                                {review.review_validity === 'REJECTED' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReviewValidity(review, 'INCLUDED')}
                                                        disabled={reviewActionId === review.id}
                                                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-slate-400 hover: disabled:opacity-50"
                                                    >
                                                        Reinstate Review
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReviewValidity(review, 'REJECTED')}
                                                        disabled={reviewActionId === review.id}
                                                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        Reject Review
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-4 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
                                            {scoreFields.map((field) => (
                                                <div key={field.key} className="rounded-2xl  p-3 text-center">
                                                    <div className="font-medium">{(review.stage1_score as any)?.[field.key]}/{field.max}</div>
                                                    <div className="text-slate-500">{field.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {review.stage1_score?.narrative_comments && (
                                            <div className="rounded-2xl border border-[#ece7db]  p-3 text-sm text-slate-500">
                                                <FileText size={14} className="mr-1 inline" />
                                                {review.stage1_score.narrative_comments}
                                            </div>
                                        )}
                                        {review.stage1_score?.detailed_recommendation && (
                                            <div className="mt-3 rounded-2xl border border-[#ece7db]  p-3 text-sm text-slate-500">
                                                <strong>Detailed recommendation:</strong> {review.stage1_score.detailed_recommendation}
                                            </div>
                                        )}
                                        {review.review_validity === 'REJECTED' && review.chair_rejection_reason && (
                                            <div className="mt-3 rounded-2xl border border-red-200  p-3 text-sm text-red-700">
                                                <strong>Chair rejection reason:</strong> {review.chair_rejection_reason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Decision Selection */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6 rounded-[24px] border border-[#ddd7cb]  p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f1eb] text-[#255c2c]">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Editorial Action</p>
                                    <label className="block font-serif text-2xl text-slate-900">Decision Recommendation</label>
                                </div>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => setDecision('ACCEPT')}
                                    className={`rounded-[22px] border-2 p-5 text-center transition-all ${decision === 'ACCEPT'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-[#ddd7cb] bg-[#fbfaf7] hover:border-green-300'
                                        }`}
                                >
                                    <CheckCircle size={24} className={`mx-auto mb-2 ${decision === 'ACCEPT' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                    <div className="font-medium text-slate-200">Accept</div>
                                    <div className="text-xs text-slate-500">Editorial approval without revisions</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDecision('TENTATIVELY_ACCEPT')}
                                    className={`rounded-[22px] border-2 p-5 text-center transition-all ${decision === 'TENTATIVELY_ACCEPT'
                                        ? 'border-yellow-500 bg-yellow-50'
                                        : 'border-[#ddd7cb] bg-[#fbfaf7] hover:border-yellow-300'
                                        }`}
                                >
                                    <AlertTriangle size={24} className={`mx-auto mb-2 ${decision === 'TENTATIVELY_ACCEPT' ? 'text-amber-400' : 'text-slate-600'}`} />
                                    <div className="font-medium text-slate-200">Tentative Accept</div>
                                    <div className="text-xs text-slate-500">Proceed with revision request</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDecision('REJECT')}
                                    className={`rounded-[22px] border-2 p-5 text-center transition-all ${decision === 'REJECT'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-[#ddd7cb] bg-[#fbfaf7] hover:border-red-300'
                                        }`}
                                >
                                    <XCircle size={24} className={`mx-auto mb-2 ${decision === 'REJECT' ? 'text-red-400' : 'text-slate-600'}`} />
                                    <div className="font-medium text-slate-200">Reject</div>
                                    <div className="text-xs text-slate-500">Editorial decline at Stage 1</div>
                                </button>
                            </div>
                        </div>

                        {/* Chair Comments */}
                        <div className="mb-6 rounded-[24px] border border-[#ddd7cb]  p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Editorial Comments {decision === 'TENTATIVELY_ACCEPT' && <span className="text-red-500">*</span>}
                            </label>
                            <p className="mb-3 text-sm text-slate-500">
                                Use this note as the formal editorial communication to the PI. When a review has been rejected above, explain the final decision basis here.
                            </p>
                            <textarea
                                value={chairComments}
                                onChange={(e) => setChairComments(e.target.value)}
                                rows={4}
                                required={decision === 'TENTATIVELY_ACCEPT'}
                                placeholder="Write the editorial decision letter for the PI..."
                                className="w-full rounded-2xl border border-[#cfc7b8] bg-[#fcfbf8] px-4 py-3 focus:border-[#314c7d] focus:ring-2 focus:ring-[#314c7d]"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap justify-end gap-3 border-t border-[#ddd7cb] bg-[#f1ede4] p-4 sm:p-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[#cfc7b8]  px-4 py-2 text-slate-400 hover:bg-[#faf8f3]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !decision}
                        className={`flex items-center rounded-xl px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50 ${decision === 'ACCEPT' ? 'bg-green-700 hover:bg-green-800' :
                            decision === 'TENTATIVELY_ACCEPT' ? 'bg-[#b98508] hover:bg-[#9d7207]' :
                                decision === 'REJECT' ? 'bg-red-700 hover:bg-red-800' :
                                    'bg-gray-400'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                            </>
                        ) : (
                            'Submit Decision'
                        )}
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Stage1DecisionModal;
