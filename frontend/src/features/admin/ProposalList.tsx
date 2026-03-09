/**
 * Proposal List Component for SRC Chair.
 * View all proposals with filtering, search, and actions.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Eye, Plus, UserPlus, CheckSquare, FileText, Mail, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { proposalApi, assignmentApi, type Proposal, cycleApi, type GrantCycle } from '../../services/api';
import ReviewerAssignmentModal from './ReviewerAssignmentModal';
import Stage1DecisionModal from './Stage1DecisionModal';
import FinalDecisionModal from './FinalDecisionModal';
import CombinedReviewView from './CombinedReviewView';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    UNDER_STAGE_1_REVIEW: 'bg-indigo-100 text-indigo-800',
    STAGE_1_REJECTED: 'bg-red-100 text-red-800',
    ACCEPTED_NO_CORRECTIONS: 'bg-green-100 text-green-800',
    TENTATIVELY_ACCEPTED: 'bg-yellow-100 text-yellow-800',
    REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
    REVISED_PROPOSAL_SUBMITTED: 'bg-purple-100 text-purple-800',
    REVISION_DEADLINE_MISSED: 'bg-red-100 text-red-800',
    UNDER_STAGE_2_REVIEW: 'bg-cyan-100 text-cyan-800',
    FINAL_ACCEPTED: 'bg-emerald-100 text-emerald-800',
    FINAL_REJECTED: 'bg-red-100 text-red-800',
};

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_STAGE_1_REVIEW', label: 'Under Stage 1 Review' },
    { value: 'STAGE_1_REJECTED', label: 'Stage 1 Rejected' },
    { value: 'TENTATIVELY_ACCEPTED', label: 'Tentatively Accepted' },
    { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
    { value: 'REVISED_PROPOSAL_SUBMITTED', label: 'Revised Submitted' },
    { value: 'UNDER_STAGE_2_REVIEW', label: 'Under Stage 2 Review' },
    { value: 'FINAL_ACCEPTED', label: 'Final Accepted' },
    { value: 'FINAL_REJECTED', label: 'Final Rejected' },
];

const ProposalList: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [cycles, setCycles] = useState<GrantCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [cycleFilter, setCycleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Modal states
    const [assignModalProposal, setAssignModalProposal] = useState<Proposal | null>(null);
    const [stage1DecisionProposal, setStage1DecisionProposal] = useState<Proposal | null>(null);
    const [finalDecisionProposal, setFinalDecisionProposal] = useState<Proposal | null>(null);
    const [reviewViewProposal, setReviewViewProposal] = useState<Proposal | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [proposalRes, cycleRes] = await Promise.all([
                proposalApi.getAll(),
                cycleApi.getAll(),
            ]);
            setProposals(proposalRes.data);
            setCycles(cycleRes.data);
        } catch (err) {
            console.error("Failed to load proposals or cycles", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProposals = proposals.filter((p) => {
        const matchesSearch =
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.pi_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.proposal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.primary_research_area_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.keywords || []).some((kw) => kw.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = !statusFilter || p.status === statusFilter;
        const matchesCycle = !cycleFilter || p.cycle.toString() === cycleFilter;
        return matchesSearch && matchesStatus && matchesCycle;
    });

    const totalPages = Math.ceil(filteredProposals.length / pageSize);
    const paginatedProposals = filteredProposals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, cycleFilter]);

    const downloadBlob = (data: BlobPart, filename: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleDownloadReport = async (proposal: Proposal) => {
        try {
            const response = await proposalApi.downloadReport(proposal.id);
            downloadBlob(response.data, `review_report_${proposal.proposal_code}.pdf`);
        } catch {
            alert('Failed to download report. Please try again.');
        }
    };

    const handleDownloadReportDocx = async (proposal: Proposal) => {
        try {
            const response = await proposalApi.downloadReportDocx(proposal.id);
            downloadBlob(response.data, `review_report_${proposal.proposal_code}.docx`);
        } catch {
            alert('Failed to download DOCX report. Please try again.');
        }
    };

    const getAvailableActions = (proposal: Proposal) => {
        const actions = [];

        if (proposal.status === 'DRAFT') {
            actions.push({ key: 'submit', label: 'Submit Proposal', icon: Send, color: 'text-emerald-600' });
        }

        // Allow adding Stage 1 reviewers while the proposal is still in the Stage 1 workflow.
        if (['SUBMITTED', 'UNDER_STAGE_1_REVIEW'].includes(proposal.status)) {
            actions.push({ key: 'assign', label: 'Assign Reviewers', icon: UserPlus, color: 'text-blue-600' });
        }

        // Notify reviewers for proposals under review
        if (['UNDER_STAGE_1_REVIEW', 'UNDER_STAGE_2_REVIEW'].includes(proposal.status)) {
            actions.push({ key: 'notify', label: 'Notify Reviewers', icon: Mail, color: 'text-amber-600' });
        }

        // Stage 1 decision for completed Stage 1 reviews
        if (['UNDER_STAGE_1_REVIEW'].includes(proposal.status)) {
            actions.push({ key: 'stage1', label: 'Stage 1 Decision', icon: CheckSquare, color: 'text-purple-600' });
        }

        // Stage 2 assignment for revised proposals
        if (['REVISED_PROPOSAL_SUBMITTED'].includes(proposal.status)) {
            actions.push({ key: 'assign_s2', label: 'Assign Stage 2', icon: UserPlus, color: 'text-cyan-600' });
            actions.push({ key: 'chair_stage2', label: 'Chair Stage 2 Review', icon: CheckSquare, color: 'text-teal-700' });
        }

        if (proposal.status === 'REVISION_DEADLINE_MISSED') {
            actions.push({ key: 'reopen_revision', label: 'Reopen Revision', icon: Clock, color: 'text-orange-700' });
        }

        // Final decision for Stage 2 completed
        if (['UNDER_STAGE_2_REVIEW'].includes(proposal.status)) {
            actions.push({ key: 'final', label: 'Final Decision', icon: CheckSquare, color: 'text-emerald-600' });
        }

        // Always show view and report
        actions.push({ key: 'view', label: 'View Details', icon: Eye, color: 'text-gray-600' });
        actions.push({ key: 'report', label: 'Download PDF', icon: Download, color: 'text-gray-600' });
        actions.push({ key: 'report_docx', label: 'Download DOCX', icon: Download, color: 'text-gray-800' });

        return actions;
    };

    const handleNotifyReviewers = async (proposal: Proposal) => {
        try {
            const response = await proposalApi.getReviews(proposal.id);
            const assignments = response.data.assignments || [];
            const pendingIds = assignments
                .filter((a: any) => a.status === 'PENDING')
                .map((a: any) => a.id);

            if (pendingIds.length === 0) {
                alert('No pending reviewers to notify.');
                return;
            }

            await assignmentApi.bulkNotify(pendingIds);
            alert(`Notification sent to ${pendingIds.length} reviewer(s).`);
        } catch {
            alert('Failed to send notifications. Please try again.');
        }
    };

    const getRevisionCountdown = (deadline: string) => {
        const now = new Date();
        const dl = new Date(deadline);
        const diffMs = dl.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600 font-semibold' };
        if (diffDays === 0) return { text: 'Due today', color: 'text-red-600 font-semibold' };
        if (diffDays <= 2) return { text: `${diffDays}d left`, color: 'text-orange-600 font-semibold' };
        return { text: `${diffDays}d left`, color: 'text-orange-500' };
    };

    const handleAction = (action: string, proposal: Proposal) => {
        switch (action) {
            case 'submit':
                proposalApi.submit(proposal.id)
                    .then(() => {
                        alert('Proposal submitted successfully.');
                        loadData();
                    })
                    .catch(() => alert('Failed to submit proposal.'));
                break;
            case 'assign':
            case 'assign_s2':
                setAssignModalProposal(proposal);
                break;
            case 'stage1':
                setStage1DecisionProposal(proposal);
                break;
            case 'final':
                setFinalDecisionProposal(proposal);
                break;
            case 'notify':
                handleNotifyReviewers(proposal);
                break;
            case 'report':
                handleDownloadReport(proposal);
                break;
            case 'report_docx':
                handleDownloadReportDocx(proposal);
                break;
            case 'reopen_revision': {
                const daysRaw = window.prompt('Extend revision window by how many days?', '7');
                if (!daysRaw) break;
                const reason = window.prompt('Reason for reopening the revision window:', '') || '';
                proposalApi.reopenRevision(proposal.id, Number(daysRaw), reason)
                    .then(() => {
                        alert('Revision window reopened.');
                        loadData();
                    })
                    .catch(() => alert('Failed to reopen revision window.'));
                break;
            }
            case 'chair_stage2': {
                const concerns_addressed = window.prompt('Concerns addressed? Enter YES, PARTIALLY, or NO.', 'YES');
                const revised_recommendation = window.prompt('Recommendation? Enter ACCEPT or REJECT.', 'ACCEPT');
                const technical_comments = window.prompt('Technical comments for this Stage 2 chair review:', '');
                if (!concerns_addressed || !revised_recommendation || !technical_comments) {
                    break;
                }
                proposalApi.submitChairStage2Review(proposal.id, {
                    concerns_addressed,
                    revised_recommendation,
                    technical_comments,
                    budget_comments: '',
                    is_draft: false,
                })
                    .then(() => {
                        alert('Chair Stage 2 review submitted.');
                        loadData();
                    })
                    .catch(() => alert('Failed to submit chair Stage 2 review.'));
                break;
            }
            case 'view':
                setReviewViewProposal(proposal);
                break;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Proposals</h1>
                    <p className="text-gray-500 mt-1">{filteredProposals.length} proposals found</p>
                </div>
                <Link
                    to="/admin/proposals/new"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Plus size={18} className="mr-2" />
                    Create Proposal
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title, PI, or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            value={cycleFilter}
                            onChange={(e) => setCycleFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Cycles</option>
                            {cycles.map((c) => (
                                <option key={c.id} value={c.id.toString()}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Proposals Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Proposal
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Principal Investigator
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Funding
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category / Keywords
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedProposals.map((proposal) => (
                                <tr key={proposal.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="flex items-center">
                                                <FileText size={16} className="text-gray-400 mr-2" />
                                                <span className="text-sm font-medium text-gray-900">{proposal.proposal_code}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                                                {proposal.title}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{proposal.pi_name}</div>
                                        <div className="text-sm text-gray-500">{proposal.pi_department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            ${proposal.fund_requested?.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {proposal.primary_research_area_name || 'Uncategorized'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                            {(proposal.keywords || []).join(', ') || 'No keywords'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {proposal.status_display || proposal.status}
                                        </span>
                                        {proposal.revision_deadline && (
                                            <div className={`text-xs mt-1 flex items-center gap-1 ${getRevisionCountdown(proposal.revision_deadline).color}`}>
                                                <Clock size={12} />
                                                {getRevisionCountdown(proposal.revision_deadline).text}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end space-x-1">
                                            {getAvailableActions(proposal).map((action) => (
                                                action.key === 'view' ? (
                                                    <Link
                                                        key={action.key}
                                                        to={`/admin/proposals/${proposal.id}`}
                                                        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${action.color}`}
                                                        title={action.label}
                                                    >
                                                        <action.icon size={16} />
                                                    </Link>
                                                ) : (
                                                    <button
                                                        key={action.key}
                                                        onClick={() => handleAction(action.key, proposal)}
                                                        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${action.color}`}
                                                        title={action.label}
                                                    >
                                                        <action.icon size={16} />
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredProposals.length)} of {filteredProposals.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <ChevronLeft size={14} className="mr-1" /> Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            Next <ChevronRight size={14} className="ml-1" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {assignModalProposal && (
                <ReviewerAssignmentModal
                    proposal={assignModalProposal}
                    onClose={() => setAssignModalProposal(null)}
                    onSuccess={() => { setAssignModalProposal(null); loadData(); }}
                />
            )}
            {stage1DecisionProposal && (
                <Stage1DecisionModal
                    proposal={stage1DecisionProposal}
                    onClose={() => setStage1DecisionProposal(null)}
                    onSuccess={() => { setStage1DecisionProposal(null); loadData(); }}
                />
            )}
            {finalDecisionProposal && (
                <FinalDecisionModal
                    proposal={finalDecisionProposal}
                    onClose={() => setFinalDecisionProposal(null)}
                    onSuccess={() => { setFinalDecisionProposal(null); loadData(); }}
                />
            )}
            {reviewViewProposal && (
                <CombinedReviewView
                    proposal={reviewViewProposal}
                    onClose={() => setReviewViewProposal(null)}
                />
            )}
        </div>
    );
};

export default ProposalList;
