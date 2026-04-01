import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Download, FileText, Save, Send, X, XCircle } from 'lucide-react';
import { proposalApi, type Proposal, type ProposalReviewsResponse, type ReviewAssignment, type Stage2Review } from '../../services/api';

interface Props {
    proposal: Proposal;
    onClose: () => void;
    onSuccess: () => void;
}

const ChairStage2ReviewModal: React.FC<Props> = ({ proposal, onClose, onSuccess }) => {
    const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
    const [existingReview, setExistingReview] = useState<Stage2Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [concernsAddressed, setConcernsAddressed] = useState<'YES' | 'PARTIALLY' | 'NO' | ''>('');
    const [revisedRecommendation, setRevisedRecommendation] = useState<'ACCEPT' | 'REJECT' | ''>('');
    const [revisedScore, setRevisedScore] = useState('');
    const [technicalComments, setTechnicalComments] = useState('');
    const [budgetComments, setBudgetComments] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const response = await proposalApi.getReviews(proposal.id);
                const payload: ProposalReviewsResponse = response.data;
                const stage1Reviews = (payload.assignments || []).filter(
                    (review) => review.stage === 1 && review.stage1_score
                );
                setReviews(stage1Reviews);

                const chairReview = (payload.chair_stage2_reviews || [])[0] || null;
                setExistingReview(chairReview);
                if (chairReview) {
                    setConcernsAddressed(chairReview.concerns_addressed as 'YES' | 'PARTIALLY' | 'NO' | '');
                    setRevisedRecommendation(chairReview.revised_recommendation as 'ACCEPT' | 'REJECT' | '');
                    setRevisedScore(chairReview.revised_score != null ? String(chairReview.revised_score) : '');
                    setTechnicalComments(chairReview.technical_comments || '');
                    setBudgetComments(chairReview.budget_comments || '');
                }
                setError(null);
            } catch {
                setError('Failed to load Stage 2 review context.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [proposal.id]);

    const isFinalized = existingReview?.is_draft === false;
    const averageStage1Score = useMemo(() => {
        if (reviews.length === 0) return 0;
        return Math.round(
            reviews.reduce((sum, review) => sum + (review.stage1_score?.total_score || 0), 0) / reviews.length
        );
    }, [reviews]);

    const handleDownload = async (fileType: string, fileName: string) => {
        try {
            const response = await proposalApi.downloadFile(proposal.id, fileType);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('File not available for download.');
        }
    };

    const submitReview = async (isDraft: boolean) => {
        if (isFinalized) {
            return;
        }
        if (!isDraft) {
            if (!concernsAddressed) {
                setError('Please indicate whether the revision addressed the concerns.');
                return;
            }
            if (!revisedRecommendation) {
                setError('Please select a revised recommendation.');
                return;
            }
            if (!technicalComments.trim()) {
                setError('Technical comments are required for a final Stage 2 review.');
                return;
            }
        }
        if (revisedScore) {
            const parsed = Number(revisedScore);
            if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
                setError('Revised score must be between 0 and 100.');
                return;
            }
        }

        try {
            setSubmitting(true);
            setError(null);
            await proposalApi.submitChairStage2Review(proposal.id, {
                concerns_addressed: concernsAddressed || undefined,
                revised_recommendation: revisedRecommendation || undefined,
                revised_score: revisedScore ? Number(revisedScore) : null,
                technical_comments: technicalComments,
                budget_comments: budgetComments,
                is_draft: isDraft,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save the Stage 2 chair review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:px-6 sm:py-8">
            <div className="flex min-h-full items-start justify-center">
                <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl  shadow-2xl">
                    <div className="border-b  bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 p-5 text-white">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Stage 2 Review</p>
                                <h2 className="mt-2 text-2xl font-semibold">SRC Chair Revision Assessment</h2>
                                <p className="mt-2 text-sm text-white/75">{proposal.proposal_code} · {proposal.title}</p>
                            </div>
                            <button onClick={onClose} className="rounded-full border border-slate-300 p-2 text-white/80 hover:/10 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-5 sm:p-6">
                        {error && (
                            <div className="mb-4 flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                                <AlertCircle size={18} className="mr-2" />
                                {error}
                            </div>
                        )}

                        {isFinalized && (
                            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                This Stage 2 chair review has already been finalized and is now read-only.
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-800" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="rounded-xl border   p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Requested Funding</p>
                                        <p className="mt-2 text-2xl font-semibold text-slate-800">${proposal.fund_requested?.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-xl border   p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stage 1 Reviews</p>
                                        <p className="mt-2 text-2xl font-semibold text-slate-800">{reviews.length}</p>
                                    </div>
                                    <div className="rounded-xl border   p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Stage 1 Score</p>
                                        <p className="mt-2 text-2xl font-semibold text-slate-800">{averageStage1Score}%</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border  p-5">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-slate-700" />
                                        <h3 className="text-base font-semibold text-slate-800">Revision Materials</h3>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <button
                                            type="button"
                                            onClick={() => handleDownload('proposal', `proposal_${proposal.proposal_code}.pdf`)}
                                            className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                                        >
                                            <Download size={16} className="mr-2" />
                                            Original Proposal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownload('revised_proposal', `revised_${proposal.proposal_code}.pdf`)}
                                            className="flex items-center justify-center rounded-lg bg-purple-600 px-4 py-3 text-white hover:bg-purple-700"
                                        >
                                            <Download size={16} className="mr-2" />
                                            Revised Proposal
                                        </button>
                                        {proposal.response_to_reviewers_file ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDownload('response_to_reviewers', `response_${proposal.proposal_code}.pdf`)}
                                                className="flex items-center justify-center rounded-lg bg-amber-600 px-4 py-3 text-white hover:bg-amber-700"
                                            >
                                                <Download size={16} className="mr-2" />
                                                PI Response
                                            </button>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                                PI did not upload a response-to-reviewers document.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border  p-5">
                                    <h3 className="text-base font-semibold text-slate-800">Stage 1 Reviewer Comments</h3>
                                    {reviews.length === 0 ? (
                                        <p className="mt-3 text-sm text-slate-500">No completed Stage 1 reviews are available.</p>
                                    ) : (
                                        <div className="mt-4 space-y-4">
                                            {reviews.map((review, index) => (
                                                <div key={review.id} className="rounded-xl border   p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-medium text-slate-800">Reviewer {index + 1}</p>
                                                            <p className="text-sm text-slate-500">{review.reviewer_name}</p>
                                                        </div>
                                                        <div className="text-right text-sm text-slate-500">
                                                            <p>Score: {review.stage1_score?.total_score ?? 0}/100</p>
                                                            <p>{review.stage1_score?.recommendation?.replace(/_/g, ' ') || 'No recommendation'}</p>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">
                                                        {review.stage1_score?.narrative_comments || 'No narrative comments provided.'}
                                                    </p>
                                                    {review.stage1_score?.detailed_recommendation && (
                                                        <div className="mt-3 rounded-lg  p-3 text-sm text-slate-400">
                                                            {review.stage1_score.detailed_recommendation}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border  p-5">
                                    <h3 className="text-base font-semibold text-slate-800">Chair Stage 2 Assessment</h3>
                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        {[
                                            { value: 'YES', label: 'Yes', description: 'All concerns addressed', tone: 'green' },
                                            { value: 'PARTIALLY', label: 'Partially', description: 'Some concerns remain', tone: 'amber' },
                                            { value: 'NO', label: 'No', description: 'Concerns remain unresolved', tone: 'red' },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => !isFinalized && setConcernsAddressed(option.value as 'YES' | 'PARTIALLY' | 'NO')}
                                                disabled={isFinalized}
                                                className={`rounded-xl border-2 p-4 text-left transition ${concernsAddressed === option.value
                                                    ? option.tone === 'green'
                                                        ? 'border-green-500 bg-green-50'
                                                        : option.tone === 'amber'
                                                            ? 'border-amber-500 bg-amber-50'
                                                            : 'border-red-500 bg-red-50'
                                                    : ' hover:border-gray-300'
                                                    } disabled:cursor-not-allowed disabled:opacity-70`}
                                            >
                                                <p className="font-medium text-slate-800">{option.label}</p>
                                                <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        {[
                                            { value: 'ACCEPT', label: 'Accept', description: 'Proposal is ready for final approval', icon: CheckCircle, activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                                            { value: 'REJECT', label: 'Reject', description: 'Revision remains insufficient', icon: XCircle, activeClass: 'border-red-500 bg-red-50 text-red-700' },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => !isFinalized && setRevisedRecommendation(option.value as 'ACCEPT' | 'REJECT')}
                                                disabled={isFinalized}
                                                className={`rounded-xl border-2 p-4 text-left transition ${revisedRecommendation === option.value
                                                    ? option.activeClass
                                                    : ' hover:border-gray-300'
                                                    } disabled:cursor-not-allowed disabled:opacity-70`}
                                            >
                                                <option.icon size={20} className="mb-3" />
                                                <p className="font-medium">{option.label}</p>
                                                <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 grid gap-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-400">Optional Revised Score</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={revisedScore}
                                                onChange={(event) => setRevisedScore(event.target.value)}
                                                disabled={isFinalized}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                                                placeholder="0 to 100"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-400">Technical Comments</label>
                                            <textarea
                                                value={technicalComments}
                                                onChange={(event) => setTechnicalComments(event.target.value)}
                                                disabled={isFinalized}
                                                rows={5}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                                                placeholder="Summarize whether the revision addressed the technical concerns raised in Stage 1."
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-400">Budget Comments</label>
                                            <textarea
                                                value={budgetComments}
                                                onChange={(event) => setBudgetComments(event.target.value)}
                                                disabled={isFinalized}
                                                rows={3}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                                                placeholder="Optional notes on revised budget alignment."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t   p-4 sm:p-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-slate-400 hover:bg-gray-100"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => submitReview(true)}
                            disabled={submitting || loading || isFinalized}
                            className="flex items-center rounded-lg bg-gray-100 px-4 py-2 text-slate-400 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save size={16} className="mr-2" />
                            Save Draft
                        </button>
                        <button
                            type="button"
                            onClick={() => submitReview(false)}
                            disabled={submitting || loading || isFinalized}
                            className="flex items-center rounded-lg bg-teal-600 px-5 py-2 text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send size={16} className="mr-2" />
                            Submit Stage 2 Review
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChairStage2ReviewModal;
