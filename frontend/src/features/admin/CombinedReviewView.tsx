/**
 * Combined Review View for SRC Chair.
 * Shows all Stage 1 and Stage 2 reviews aggregated for a proposal.
 * Can be used as a standalone view or embedded in other components.
 */
import React, { useState, useEffect } from 'react';
import { X, Download, Star, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { proposalApi, type Proposal, type ReviewAssignment, type Stage2Review } from '../../services/api';

interface Props {
    proposal: Proposal;
    onClose: () => void;
}

const SCORE_LABELS: Record<string, { label: string; max: number }> = {
    originality_score: { label: 'Originality', max: 15 },
    clarity_score: { label: 'Clarity', max: 15 },
    literature_review_score: { label: 'Literature Review', max: 15 },
    methodology_score: { label: 'Methodology', max: 15 },
    impact_score: { label: 'Impact', max: 15 },
    publication_potential_score: { label: 'Publication Potential', max: 10 },
    budget_appropriateness_score: { label: 'Budget Appropriateness', max: 10 },
    timeline_practicality_score: { label: 'Timeline Practicality', max: 5 },
};

const CombinedReviewView: React.FC<Props> = ({ proposal, onClose }) => {
    const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
    const [chairStage2Reviews, setChairStage2Reviews] = useState<Stage2Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, [proposal.id]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const response = await proposalApi.getReviews(proposal.id);
            setReviews(Array.isArray(response.data.assignments) ? response.data.assignments : []);
            setChairStage2Reviews(Array.isArray(response.data.chair_stage2_reviews) ? response.data.chair_stage2_reviews : []);
        } catch {
            setReviews([]);
            setChairStage2Reviews([]);
        } finally {
            setLoading(false);
        }
    };

    const stage1Reviews = reviews.filter(r => r.stage === 1 && r.stage1_score);
    const stage2Reviews = reviews.filter(r => r.stage === 2 && r.stage2_review);

    const avgScores = stage1Reviews.length > 0
        ? Object.keys(SCORE_LABELS).reduce((acc, key) => {
            const sum = stage1Reviews.reduce((s, r) => s + ((r.stage1_score as any)?.[key] || 0), 0);
            acc[key] = sum / stage1Reviews.length;
            return acc;
        }, {} as Record<string, number>)
        : {};

    const avgTotal = stage1Reviews.length > 0
        ? stage1Reviews.reduce((s, r) => s + (r.stage1_score?.total_score || 0), 0) / stage1Reviews.length
        : 0;

    const handleDownloadReport = async () => {
        try {
            const response = await proposalApi.downloadReport(proposal.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `review_report_${proposal.proposal_code}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download report.');
        }
    };

    const handleDownloadReportDocx = async () => {
        try {
            const response = await proposalApi.downloadReportDocx(proposal.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `review_report_${proposal.proposal_code}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download DOCX report.');
        }
    };

    const handleDownloadProposalFile = async (fileType: string, filename: string, errorMessage: string) => {
        try {
            const response = await proposalApi.downloadFile(proposal.id, fileType);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert(errorMessage);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className=" rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0  border-b  p-6 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-base font-semibold text-slate-200">Combined Review Report</h2>
                        <p className="text-sm text-slate-500">{proposal.proposal_code} - {proposal.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadReport}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            <Download size={16} className="mr-1" /> Download PDF
                        </button>
                        <button
                            onClick={handleDownloadReportDocx}
                            className="flex items-center px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
                        >
                            <Download size={16} className="mr-1" /> Download DOCX
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner" />
                        </div>
                    ) : (
                        <>
                            {/* Proposal Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">PI:</span> <span className="font-medium">{proposal.pi_name}</span></div>
                                <div><span className="text-slate-500">Department:</span> <span className="font-medium">{proposal.pi_department}</span></div>
                                <div><span className="text-slate-500">Fund Requested:</span> <span className="font-medium">${proposal.fund_requested?.toLocaleString()}</span></div>
                                <div><span className="text-slate-500">Status:</span> <span className="font-medium">{proposal.status_display || proposal.status}</span></div>
                            </div>

                            {proposal.abstract && (
                                <div className="rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Abstract</h3>
                                    <p className="text-sm text-slate-500 whitespace-pre-wrap">{proposal.abstract}</p>
                                </div>
                            )}

                            {(proposal.revised_proposal_file || proposal.response_to_reviewers_file) && (
                                <div className="rounded-xl border  p-4">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-3">Revision Materials</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleDownloadProposalFile(
                                                'proposal',
                                                `proposal_${proposal.proposal_code}.pdf`,
                                                'Failed to download original proposal.'
                                            )}
                                            className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                        >
                                            <Download size={14} className="mr-1" /> Original Proposal
                                        </button>
                                        {proposal.revised_proposal_file && (
                                            <button
                                                onClick={() => handleDownloadProposalFile(
                                                    'revised_proposal',
                                                    `revised_${proposal.proposal_code}.pdf`,
                                                    'Failed to download revised proposal.'
                                                )}
                                                className="flex items-center rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
                                            >
                                                <Download size={14} className="mr-1" /> Revised Proposal
                                            </button>
                                        )}
                                        {proposal.response_to_reviewers_file && (
                                            <button
                                                onClick={() => handleDownloadProposalFile(
                                                    'response_to_reviewers',
                                                    `response_${proposal.proposal_code}.pdf`,
                                                    'Failed to download response to reviewers.'
                                                )}
                                                className="flex items-center rounded-lg bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700"
                                            >
                                                <Download size={14} className="mr-1" /> PI Response
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Average Score Summary */}
                            {stage1Reviews.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Star size={20} className="text-brand-400" />
                                        <h3 className="text-lg font-semibold text-blue-900">
                                            Average Scores ({stage1Reviews.length} reviewer{stage1Reviews.length > 1 ? 's' : ''})
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        {Object.entries(SCORE_LABELS).map(([key, { label, max }]) => (
                                            <div key={key} className=" rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-brand-400">{(avgScores[key] || 0).toFixed(1)}</div>
                                                <div className="text-xs text-slate-500">{label} (/{max})</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className=" rounded-lg p-4 text-center">
                                        <div className="text-3xl font-bold text-blue-700">{avgTotal.toFixed(1)}/100</div>
                                        <div className="text-sm text-slate-500">Average Total Score</div>
                                    </div>
                                </div>
                            )}

                            {/* Individual Stage 1 Reviews */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-200 mb-4">Stage 1 Reviews</h3>
                                {stage1Reviews.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No completed Stage 1 reviews yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {stage1Reviews.map((review, idx) => (
                                            <div key={review.id} className=" border  rounded-xl p-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-slate-200">Reviewer {idx + 1}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-brand-400">
                                                            {review.stage1_score?.total_score}/100
                                                        </span>
                                                        <span className="text-sm text-slate-500">
                                                            ({review.stage1_score?.percentage_score}%)
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 mb-3">
                                                    {Object.entries(SCORE_LABELS).map(([key, { label, max }]) => (
                                                        <div key={key} className="text-center p-2  rounded">
                                                            <div className="font-semibold text-slate-200">{(review.stage1_score as any)?.[key]}</div>
                                                            <div className="text-xs text-slate-500">{label} (/{max})</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {review.stage1_score?.recommendation && (
                                                    <div className="mb-2">
                                                        <span className="text-sm text-slate-500">Recommendation: </span>
                                                        <span className="text-sm font-medium">{review.stage1_score.recommendation}</span>
                                                    </div>
                                                )}
                                                {review.stage1_score?.narrative_comments && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <MessageSquare size={14} className="text-slate-600" />
                                                            <span className="text-xs font-semibold text-slate-500 uppercase">Comments</span>
                                                        </div>
                                                        <p className="text-sm text-slate-400 whitespace-pre-wrap">{review.stage1_score.narrative_comments}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stage 2 Reviews */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-200 mb-4">Stage 2 Reviews</h3>
                                {stage2Reviews.length === 0 && chairStage2Reviews.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No completed Stage 2 reviews yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {stage2Reviews.map((review, idx) => (
                                            <div key={review.id} className=" border  rounded-xl p-5">
                                                <h4 className="font-semibold text-slate-200 mb-3">Reviewer {idx + 1}</h4>
                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Concerns Addressed:</span>
                                                        {review.stage2_review?.concerns_addressed === 'YES' && <CheckCircle size={16} className="text-green-500" />}
                                                        {review.stage2_review?.concerns_addressed === 'NO' && <XCircle size={16} className="text-red-500" />}
                                                        {review.stage2_review?.concerns_addressed === 'PARTIALLY' && <AlertCircle size={16} className="text-yellow-500" />}
                                                        <span className="text-sm font-medium">{review.stage2_review?.concerns_addressed}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Recommendation:</span>
                                                        <span className={`text-sm font-medium ${review.stage2_review?.revised_recommendation === 'ACCEPT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {review.stage2_review?.revised_recommendation}
                                                        </span>
                                                    </div>
                                                </div>
                                                {review.stage2_review?.technical_comments && (
                                                    <div className="mt-2">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase">Technical Comments</span>
                                                        <p className="text-sm text-slate-400 mt-1">{review.stage2_review.technical_comments}</p>
                                                    </div>
                                                )}
                                                {review.stage2_review?.budget_comments && (
                                                    <div className="mt-2">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase">Budget Comments</span>
                                                        <p className="text-sm text-slate-400 mt-1">{review.stage2_review.budget_comments}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {chairStage2Reviews.map((review) => (
                                            <div key={review.id} className=" border  rounded-xl p-5">
                                                <h4 className="font-semibold text-slate-200 mb-3">SRC Chair</h4>
                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Concerns Addressed:</span>
                                                        <span className="text-sm font-medium">{review.concerns_addressed}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Recommendation:</span>
                                                        <span className={`text-sm font-medium ${review.revised_recommendation === 'ACCEPT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {review.revised_recommendation}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-xs font-semibold text-slate-500 uppercase">Technical Comments</span>
                                                    <p className="text-sm text-slate-400 mt-1">{review.technical_comments}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CombinedReviewView;
