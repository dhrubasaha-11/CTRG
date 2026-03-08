/**
 * PI Proposal Detail View - Read-only view of a submitted proposal with status, decisions, and file downloads.
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    FileText, Download, Clock, CheckCircle, XCircle,
    ArrowLeft, Calendar, DollarSign, User, Mail, Building
} from 'lucide-react';
import { proposalApi, type Proposal, type ReviewAssignment } from '../../services/api';
import StatusTracker from './StatusTracker';

const ProposalDetailView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) loadProposal(parseInt(id));
    }, [id]);

    const loadProposal = async (proposalId: number) => {
        try {
            setLoading(true);
            const [proposalRes, reviewsRes] = await Promise.all([
                proposalApi.getById(proposalId),
                proposalApi.getReviews(proposalId).catch(() => ({ data: [] })),
            ]);
            setProposal(proposalRes.data);
            setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
        } catch {
            setError('Failed to load proposal details.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (fileType: string, fileName: string) => {
        if (!id) return;
        try {
            const response = await proposalApi.downloadFile(parseInt(id), fileType);
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

    const getRevisionCountdown = () => {
        if (!proposal?.revision_deadline) return null;
        const deadline = new Date(proposal.revision_deadline);
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) return 'Deadline passed';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h remaining`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700">{error || 'Proposal not found'}</p>
                <Link to="/pi/dashboard" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700">
                    <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/pi/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500">{proposal.proposal_code}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {proposal.status_display || proposal.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{proposal.title}</h1>
                </div>
            </div>

            {/* Status Tracker */}
            {proposal.status !== 'DRAFT' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <StatusTracker status={proposal.status} />
                </div>
            )}

            {/* Revision Deadline Alert */}
            {proposal.status === 'REVISION_REQUESTED' && proposal.revision_deadline && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                    <Clock size={20} className="text-orange-600" />
                    <div>
                        <p className="font-semibold text-orange-800">Revision Deadline</p>
                        <p className="text-sm text-orange-700">
                            {new Date(proposal.revision_deadline).toLocaleString()} - {getRevisionCountdown()}
                        </p>
                    </div>
                    <Link
                        to={`/pi/proposals/${proposal.id}/revise`}
                        className="ml-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        Submit Revision
                    </Link>
                </div>
            )}

            {/* Proposal Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* PI Information */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold mb-4">Proposal Information</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <User size={16} className="text-gray-400" />
                                <span className="text-gray-600">PI:</span>
                                <span className="font-medium">{proposal.pi_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail size={16} className="text-gray-400" />
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium">{proposal.pi_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Building size={16} className="text-gray-400" />
                                <span className="text-gray-600">Department:</span>
                                <span className="font-medium">{proposal.pi_department}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <DollarSign size={16} className="text-gray-400" />
                                <span className="text-gray-600">Fund Requested:</span>
                                <span className="font-medium">${proposal.fund_requested?.toLocaleString()}</span>
                            </div>
                            {proposal.co_investigators && (
                                <div className="col-span-2 flex items-start gap-2 text-sm">
                                    <User size={16} className="text-gray-400 mt-0.5" />
                                    <span className="text-gray-600">Co-Investigators:</span>
                                    <span className="font-medium">{proposal.co_investigators}</span>
                                </div>
                            )}
                            <div className="col-span-2 flex items-center gap-2 text-sm">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-gray-600">Cycle:</span>
                                <span className="font-medium">{proposal.cycle_name}</span>
                            </div>
                        </div>
                        {proposal.abstract && (
                            <div className="mt-4 pt-4 border-t">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h3>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{proposal.abstract}</p>
                            </div>
                        )}
                    </div>

                    {/* Decision Information */}
                    {proposal.approved_amount !== undefined && proposal.approved_amount !== null && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={20} className="text-green-600" />
                                <h2 className="text-lg font-semibold text-green-800">Final Decision</h2>
                            </div>
                            <p className="text-sm text-green-700">
                                Approved Grant Amount: <span className="font-bold text-lg">${proposal.approved_amount.toLocaleString()}</span>
                            </p>
                        </div>
                    )}
                    {(proposal.status === 'STAGE_1_REJECTED' || proposal.status === 'FINAL_REJECTED') && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <div className="flex items-center gap-2">
                                <XCircle size={20} className="text-red-600" />
                                <h2 className="text-lg font-semibold text-red-800">Proposal Not Accepted</h2>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: File Downloads */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Documents</h3>
                        <div className="space-y-2">
                            {proposal.proposal_file && (
                                <button
                                    onClick={() => handleDownload('proposal', `proposal_${proposal.proposal_code}.pdf`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                >
                                    <FileText size={18} className="text-blue-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">Research Proposal</p>
                                        <p className="text-xs text-gray-500">Original submission</p>
                                    </div>
                                    <Download size={16} className="text-gray-400" />
                                </button>
                            )}
                            {(proposal as any).application_template_file && (
                                <button
                                    onClick={() => handleDownload('application_template', `template_${proposal.proposal_code}.pdf`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                >
                                    <FileText size={18} className="text-green-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">Application Template</p>
                                    </div>
                                    <Download size={16} className="text-gray-400" />
                                </button>
                            )}
                            {(proposal as any).revised_proposal_file && (
                                <button
                                    onClick={() => handleDownload('revised_proposal', `revised_${proposal.proposal_code}.pdf`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                >
                                    <FileText size={18} className="text-purple-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">Revised Proposal</p>
                                    </div>
                                    <Download size={16} className="text-gray-400" />
                                </button>
                            )}
                            {(proposal as any).response_to_reviewers_file && (
                                <button
                                    onClick={() => handleDownload('response_to_reviewers', `response_${proposal.proposal_code}.pdf`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                >
                                    <FileText size={18} className="text-orange-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">Response to Reviewers</p>
                                    </div>
                                    <Download size={16} className="text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Created</span>
                                <span className="font-medium">{new Date(proposal.created_at).toLocaleDateString()}</span>
                            </div>
                            {proposal.submitted_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Submitted</span>
                                    <span className="font-medium">{new Date(proposal.submitted_at).toLocaleDateString()}</span>
                                </div>
                            )}
                            {proposal.revision_deadline && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Revision Deadline</span>
                                    <span className="font-medium">{new Date(proposal.revision_deadline).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProposalDetailView;
