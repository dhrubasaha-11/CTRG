/**
 * Revision Form Component.
 * For submitting revisions after Stage 1 tentative acceptance.
 * Includes response to reviewers document and revised proposal upload.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertCircle, X, Send, Clock, CheckCircle } from 'lucide-react';
import { proposalApi, type Proposal } from '../../services/api';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const RevisionForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [combinedComments, setCombinedComments] = useState<Array<{
        reviewer: string;
        recommendation: string;
        narrative_comments: string;
        detailed_recommendation: string;
        is_excluded: boolean;
    }>>([]);
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    const [revisedProposal, setRevisedProposal] = useState<File | null>(null);
    const [responseToReviewers, setResponseToReviewers] = useState<File | null>(null);
    const [revisionNotes, setRevisionNotes] = useState('');

    const loadProposal = useCallback(async () => {
        try {
            setLoading(true);
            const [proposalResponse, commentsResponse] = await Promise.all([
                proposalApi.getById(Number(id)),
                proposalApi.getCombinedComments(Number(id)),
            ]);

            setProposal(proposalResponse.data);
            setCombinedComments(commentsResponse.data.comments || []);
        } catch {
            setError('Failed to load proposal. Please try again.');
            setProposal(null);
            setCombinedComments([]);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProposal();
    }, [loadProposal]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<File | null>>
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError('File size exceeds 50MB limit');
                return;
            }
            setter(file);
            setError(null);
        }
    };

    const getDaysRemaining = () => {
        if (!proposal?.revision_deadline) return 0;
        return Math.ceil(
            (new Date(proposal.revision_deadline).getTime() - currentTime) / (1000 * 60 * 60 * 24)
        );
    };

    const handleSubmit = async () => {
        if (!revisedProposal) {
            setError('Please upload the revised proposal document');
            return;
        }

        if (!window.confirm('Are you sure you want to submit this revision? This action cannot be undone.')) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const data = new FormData();
            data.append('revised_proposal_file', revisedProposal);
            if (responseToReviewers) {
                data.append('response_to_reviewers_file', responseToReviewers);
            }

            await proposalApi.submitRevision(Number(id), data);

            alert('Revision submitted successfully!');
            navigate('/pi/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit revision');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/pi/dashboard')}
                    className="flex items-center text-slate-500 hover:text-slate-200 mb-2"
                >
                    <ArrowLeft size={16} className="mr-1" />
                    Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-slate-100">Submit Revision</h1>
                <p className="text-slate-500">{proposal?.proposal_code} - {proposal?.title}</p>
            </div>

            {/* Deadline Warning */}
            <div className={`p-4 rounded-xl flex items-center ${daysRemaining <= 3 ? 'rounded-xl" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)"}}' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                <Clock size={24} className={daysRemaining <= 3 ? 'text-red-400 mr-3' : 'text-amber-400 mr-3'} />
                <div>
                    <p className={`font-semibold ${daysRemaining <= 3 ? 'text-red-400' : 'text-yellow-800'}`}>
                        Revision Deadline: {proposal?.revision_deadline && new Date(proposal.revision_deadline).toLocaleDateString()}
                    </p>
                    <p className={`text-sm ${daysRemaining <= 3 ? 'text-red-400' : 'text-yellow-700'}`}>
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Deadline passed!'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)"}} rounded-lg flex items-center text-red-400">
                    <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="font-semibold text-blue-900 mb-3">Revision Instructions</h2>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                        <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                        Address all concerns raised by reviewers in Stage 1
                    </li>
                    <li className="flex items-start">
                        <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                        Upload your revised proposal with changes highlighted
                    </li>
                    <li className="flex items-start">
                        <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                        Provide a point-by-point response to each reviewer comment
                    </li>
                    <li className="flex items-start">
                        <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                        Include any budget revisions if applicable
                    </li>
                </ul>
            </div>

            <div className="card p-6">
                <h2 className="font-semibold text-slate-200 mb-3">Combined Reviewer Comments</h2>
                {combinedComments.length === 0 ? (
                    <p className="text-sm text-slate-500">No Stage 1 reviewer comments are available yet.</p>
                ) : (
                    <div className="space-y-4">
                        {combinedComments.map((comment, index) => (
                            <div key={`${comment.reviewer}-${index}`} className="rounded-lg border  p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-slate-200">Reviewer {index + 1}</p>
                                    <span className="text-sm text-slate-500">{comment.reviewer}</span>
                                </div>
                                {comment.recommendation && (
                                    <p className="mt-2 text-sm text-slate-500">
                                        Recommendation: {comment.recommendation.replace(/_/g, ' ')}
                                    </p>
                                )}
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    {comment.narrative_comments || 'No narrative comments provided.'}
                                </p>
                                {comment.detailed_recommendation && (
                                    <div className="mt-3 rounded-md  p-3 text-sm text-slate-400">
                                        {comment.detailed_recommendation}
                                    </div>
                                )}
                                {comment.is_excluded && (
                                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-amber-700">
                                        Excluded from chair decision
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* File Uploads */}
            <div className="card p-6 space-y-6">
                {/* Revised Proposal */}
                <div>
                    <label className="block font-medium text-slate-200 mb-2">
                        Revised Proposal Document <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-slate-500 mb-3">
                        Upload your revised proposal with changes highlighted (PDF or Word, max 50MB)
                    </p>

                    {revisedProposal ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={24} className="text-emerald-400 mr-3" />
                                <div>
                                    <p className="font-medium text-slate-200">{revisedProposal.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {(revisedProposal.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setRevisedProposal(null)} className="text-slate-600 hover:text-red-400">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors">
                                <Upload size={32} className="mx-auto text-slate-600 mb-2" />
                                <p className="font-medium text-slate-400">Upload Revised Proposal</p>
                                <p className="text-sm text-slate-500">PDF or Word document</p>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleFileChange(e, setRevisedProposal)}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Response to Reviewers */}
                <div>
                    <label className="block font-medium text-slate-200 mb-2">
                        Response to Reviewers <span className="text-sm font-normal text-slate-600">(optional)</span>
                    </label>
                    <p className="text-sm text-slate-500 mb-3">
                        Provide a point-by-point response addressing each reviewer's comments (PDF or Word, max 50MB)
                    </p>

                    {responseToReviewers ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={24} className="text-emerald-400 mr-3" />
                                <div>
                                    <p className="font-medium text-slate-200">{responseToReviewers.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {(responseToReviewers.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setResponseToReviewers(null)} className="text-slate-600 hover:text-red-400">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                <Upload size={32} className="mx-auto text-slate-600 mb-2" />
                                <p className="font-medium text-slate-400">Upload Response to Reviewers</p>
                                <p className="text-sm text-slate-500">PDF or Word document</p>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => handleFileChange(e, setResponseToReviewers)}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Additional Notes */}
                <div>
                    <label className="block font-medium text-slate-200 mb-2">
                        Additional Notes (Optional)
                    </label>
                    <textarea
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        rows={4}
                        placeholder="Any additional comments or notes for the reviewers..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate('/pi/dashboard')}
                    className="px-4 py-2 border border-gray-300 text-slate-400 rounded-lg hover:"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !revisedProposal}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={18} className="mr-2" />
                    Submit Revision
                </button>
            </div>
        </div>
    );
};

export default RevisionForm;
