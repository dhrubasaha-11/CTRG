/**
 * Final Decision Modal Component.
 * Allows SRC Chair to make final funding decisions after Stage 2 review.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, XCircle, DollarSign, FileText, Download } from 'lucide-react';
import { proposalApi, type Proposal, type ReviewAssignment, type Stage2Review } from '../../services/api';

interface Props {
    proposal: Proposal;
    onClose: () => void;
    onSuccess: () => void;
}

const FinalDecisionModal: React.FC<Props> = ({ proposal, onClose, onSuccess }) => {
    const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED' | ''>('');
    const [approvedAmount, setApprovedAmount] = useState(proposal.fund_requested?.toString() || '');
    const [finalRemarks, setFinalRemarks] = useState('');
    const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
    const [chairStage2Reviews, setChairStage2Reviews] = useState<Stage2Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReviews = useCallback(async () => {
        try {
            setLoading(true);
            const response = await proposalApi.getReviews(proposal.id);
            setReviews(response.data.assignments || []);
            setChairStage2Reviews(response.data.chair_stage2_reviews || []);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!decision) {
            setError('Please select a decision');
            return;
        }

        if (!finalRemarks.trim()) {
            setError('Please provide final remarks');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await proposalApi.finalDecision(
                proposal.id,
                decision,
                decision === 'REJECTED' ? 0 : (parseFloat(approvedAmount) || 0),
                finalRemarks
            );
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit decision');
        } finally {
            setSubmitting(false);
        }
    };

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

    const stage1Reviews = reviews.filter(r => r.stage === 1 && r.stage1_score);
    const stage2Reviews = reviews.filter(r => r.stage === 2 && r.stage2_review);
    const recommendations = stage2Reviews.map(r => r.stage2_review?.revised_recommendation);
    const chairRecommendations = chairStage2Reviews.map((review) => review.revised_recommendation);
    const acceptCount = recommendations.filter(r => r === 'ACCEPT').length + chairRecommendations.filter(r => r === 'ACCEPT').length;
    const rejectCount = recommendations.filter(r => r === 'REJECT').length + chairRecommendations.filter(r => r === 'REJECT').length;
    const averageStage1Score = stage1Reviews.length > 0
        ? Math.round(
            stage1Reviews.reduce((sum, review) => sum + (review.stage1_score?.total_score || 0), 0) / stage1Reviews.length
        )
        : 0;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-4 sm:px-6 sm:py-8">
            <div className="flex min-h-full items-start justify-center">
                <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl  shadow-2xl">
                {/* Header */}
                <div className="border-b  bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                        <div className="text-white">
                            <h2 className="text-xl font-semibold">Final Funding Decision</h2>
                            <p className="text-emerald-100 text-sm mt-1">{proposal.proposal_code} - {proposal.title}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X size={24} />
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

                    {/* Proposal Info */}
                    <div className="mb-6 p-4  rounded-xl">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <span className="text-sm text-slate-500">Principal Investigator</span>
                                <div className="font-medium text-slate-200">{proposal.pi_name}</div>
                                <div className="text-sm text-slate-500">{proposal.pi_department}</div>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Requested Funding</span>
                                <div className="font-medium text-slate-200 text-lg">
                                    ${proposal.fund_requested?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mb-6 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border   p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stage 1 Reviews</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-200">{stage1Reviews.length}</p>
                        </div>
                        <div className="rounded-xl border   p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Stage 1 Score</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-200">{averageStage1Score}%</p>
                        </div>
                        <div className="rounded-xl border   p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Proposal Lock</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">Finalization will lock all further edits.</p>
                        </div>
                    </div>

                    <div className="mb-6 rounded-xl border  p-5">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-200">Revision Record</h3>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
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
                                    No response-to-reviewers document was uploaded.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-6 rounded-xl border  p-5">
                        <h3 className="font-semibold text-slate-200">Stage 1 Review Record</h3>
                        {stage1Reviews.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">No completed Stage 1 reviews available.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {stage1Reviews.map((review, idx) => (
                                    <div key={review.id} className="rounded-lg border   p-4">
                                        <div className="flex justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-slate-200">Reviewer {idx + 1}</p>
                                                <p className="text-sm text-slate-500">{review.reviewer_name}</p>
                                            </div>
                                            <div className="text-right text-sm text-slate-500">
                                                <p>{review.stage1_score?.total_score ?? 0}/100</p>
                                                <p>{review.stage1_score?.recommendation?.replace(/_/g, ' ') || 'No recommendation'}</p>
                                            </div>
                                        </div>
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">
                                            {review.stage1_score?.narrative_comments || 'No narrative comments provided.'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stage 2 Review Summary */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-slate-200">Stage 2 Review Summary</h3>
                            <div className="flex space-x-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-green">
                                    <CheckCircle size={12} className="mr-1" /> {acceptCount} Accept
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-red">
                                    <XCircle size={12} className="mr-1" /> {rejectCount} Reject
                                </span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stage2Reviews.map((review, idx) => (
                                    <div key={review.id} className=" p-4 rounded-lg border ">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-sm font-medium text-slate-200">Reviewer {idx + 1}</span>
                                                <span className="text-sm text-slate-500 ml-2">({review.reviewer_name})</span>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${review.stage2_review?.revised_recommendation === 'ACCEPT'
                                                ? 'badge-green'
                                                : 'badge-red'
                                                }`}>
                                                {review.stage2_review?.revised_recommendation}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                            <div>
                                                <span className="text-slate-500">Concerns Addressed:</span>
                                                <span className={`ml-2 font-medium ${review.stage2_review?.concerns_addressed === 'YES' ? 'text-emerald-400' :
                                                    review.stage2_review?.concerns_addressed === 'PARTIALLY' ? 'text-amber-400' :
                                                        'text-red-400'
                                                    }`}>
                                                    {review.stage2_review?.concerns_addressed}
                                                </span>
                                            </div>
                                            {review.stage2_review?.revised_score && (
                                                <div>
                                                    <span className="text-slate-500">Revised Score:</span>
                                                    <span className="ml-2 font-medium text-slate-200">
                                                        {review.stage2_review.revised_score}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {review.stage2_review?.technical_comments && (
                                            <div className="text-sm text-slate-500  p-2 rounded mt-2">
                                                <FileText size={14} className="inline mr-1" />
                                                <strong>Technical:</strong> {review.stage2_review.technical_comments}
                                            </div>
                                        )}
                                        {review.stage2_review?.budget_comments && (
                                            <div className="text-sm text-slate-500  p-2 rounded mt-2">
                                                <FileText size={14} className="inline mr-1" />
                                                <strong>Budget:</strong> {review.stage2_review.budget_comments}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {chairStage2Reviews.map((review) => (
                                    <div key={review.id} className=" p-4 rounded-lg border ">
                                        <div className="mb-2 flex justify-between items-start">
                                            <div>
                                                <span className="text-sm font-medium text-slate-200">SRC Chair</span>
                                                <span className="ml-2 text-sm text-slate-500">Direct Stage 2 review</span>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${review.revised_recommendation === 'ACCEPT'
                                                ? 'badge-green'
                                                : 'badge-red'
                                                }`}>
                                                {review.revised_recommendation}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                            <div>
                                                <span className="text-slate-500">Concerns Addressed:</span>
                                                <span className={`ml-2 font-medium ${review.concerns_addressed === 'YES' ? 'text-emerald-400' :
                                                    review.concerns_addressed === 'PARTIALLY' ? 'text-amber-400' :
                                                        'text-red-400'
                                                    }`}>
                                                    {review.concerns_addressed}
                                                </span>
                                            </div>
                                            {review.revised_score != null && (
                                                <div>
                                                    <span className="text-slate-500">Revised Score:</span>
                                                    <span className="ml-2 font-medium text-slate-200">{review.revised_score}%</span>
                                                </div>
                                            )}
                                        </div>
                                        {review.technical_comments && (
                                            <div className="text-sm text-slate-500  p-2 rounded mt-2">
                                                <FileText size={14} className="inline mr-1" />
                                                <strong>Technical:</strong> {review.technical_comments}
                                            </div>
                                        )}
                                        {review.budget_comments && (
                                            <div className="text-sm text-slate-500  p-2 rounded mt-2">
                                                <FileText size={14} className="inline mr-1" />
                                                <strong>Budget:</strong> {review.budget_comments}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Decision Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Decision Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-3">Final Decision</label>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setDecision('ACCEPTED')}
                                    className={`p-4 border-2 rounded-xl text-center transition-all ${decision === 'ACCEPTED'
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : ' hover:border-emerald-300'
                                        }`}
                                >
                                    <CheckCircle size={28} className={`mx-auto mb-2 ${decision === 'ACCEPTED' ? 'text-emerald-600' : 'text-slate-600'}`} />
                                    <div className="font-semibold text-slate-200">Accept & Fund</div>
                                    <div className="text-sm text-slate-500">Approve grant funding</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDecision('REJECTED')}
                                    className={`p-4 border-2 rounded-xl text-center transition-all ${decision === 'REJECTED'
                                        ? 'border-red-500 bg-red-50'
                                        : ' hover:border-red-300'
                                        }`}
                                >
                                    <XCircle size={28} className={`mx-auto mb-2 ${decision === 'REJECTED' ? 'text-red-400' : 'text-slate-600'}`} />
                                    <div className="font-semibold text-slate-200">Reject</div>
                                    <div className="text-sm text-slate-500">Do not fund proposal</div>
                                </button>
                            </div>
                        </div>

                        {/* Approved Amount (only if accepted) */}
                        {decision === 'ACCEPTED' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Approved Funding Amount
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign size={18} className="text-slate-600" />
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={approvedAmount}
                                        onChange={(e) => setApprovedAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Enter approved amount"
                                    />
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    Requested: ${proposal.fund_requested?.toLocaleString()}
                                </p>
                            </div>
                        )}

                        {/* Final Remarks */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Final Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={finalRemarks}
                                onChange={(e) => setFinalRemarks(e.target.value)}
                                rows={4}
                                required
                                placeholder="Provide final remarks and justification for the decision..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap justify-end gap-3 border-t   p-4 sm:p-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-slate-400 rounded-lg hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !decision || !finalRemarks.trim()}
                        className={`px-6 py-2 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${decision === 'ACCEPTED' ? 'bg-emerald-600 hover:bg-emerald-700' :
                            decision === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' :
                                'bg-gray-400'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                {decision === 'ACCEPTED' ? <CheckCircle size={18} className="mr-2" /> : <XCircle size={18} className="mr-2" />}
                                Submit Final Decision
                            </>
                        )}
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};

export default FinalDecisionModal;
