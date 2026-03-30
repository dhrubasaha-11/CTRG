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
import ChairStage2ReviewModal from './ChairStage2ReviewModal';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'badge-slate',
    SUBMITTED: 'badge-brand',
    UNDER_STAGE_1_REVIEW: 'badge-amber',
    STAGE_1_REJECTED: 'badge-red',
    ACCEPTED_NO_CORRECTIONS: 'badge-green',
    TENTATIVELY_ACCEPTED: 'badge-amber',
    REVISION_REQUESTED: 'badge-orange',
    REVISED_PROPOSAL_SUBMITTED: 'badge-violet',
    REVISION_DEADLINE_MISSED: 'badge-red',
    UNDER_STAGE_2_REVIEW: 'badge-cyan',
    FINAL_ACCEPTED: 'badge-green',
    FINAL_REJECTED: 'badge-red',
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
    const [chairStage2Proposal, setChairStage2Proposal] = useState<Proposal | null>(null);

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
        if (['REVISED_PROPOSAL_SUBMITTED', 'UNDER_STAGE_2_REVIEW'].includes(proposal.status)) {
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
                setChairStage2Proposal(proposal);
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
                    <h1 className="text-2xl font-bold text-slate-100">All Proposals</h1>
                    <p className="text-sm text-slate-500 mt-1">{filteredProposals.length} proposals found</p>
                </div>
                <Link
                    to="/admin/proposals/new"
                    className="btn btn-primary flex items-center gap-2"
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
                                className="input has-icon-left"
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            value={cycleFilter}
                            onChange={(e) => setCycleFilter(e.target.value)}
                            className="input"
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
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="table w-full">
                        <thead className="" style={{background:"rgba(0,0,0,0.2)"}}>
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Proposal
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Principal Investigator
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Funding
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Category / Keywords
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedProposals.map((proposal) => (
                                <tr key={proposal.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-3.5">
                                        <div>
                                            <div className="flex items-center">
                                                <FileText size={16} className="text-slate-600 mr-2" />
                                                <span className="text-sm font-semibold text-slate-200">{proposal.proposal_code}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                                                {proposal.title}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-sm font-semibold text-slate-200">{proposal.pi_name}</div>
                                        <div className="text-xs text-slate-500">{proposal.pi_department}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-sm font-semibold text-slate-200">
                                            ${proposal.fund_requested?.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-sm font-medium text-slate-300">
                                            {proposal.primary_research_area_name || 'Uncategorized'}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-0.5 max-w-xs truncate">
                                            {(proposal.keywords || []).join(', ') || 'No keywords'}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`badge ${STATUS_COLORS[proposal.status] || 'badge-slate'}`}>
                                            {proposal.status_display || proposal.status}
                                        </span>
                                        {proposal.revision_deadline && (
                                            <div className={`text-xs mt-1 flex items-center gap-1 ${getRevisionCountdown(proposal.revision_deadline).color}`}>
                                                <Clock size={12} />
                                                {getRevisionCountdown(proposal.revision_deadline).text}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                        <div className="flex justify-end space-x-1">
                                            {getAvailableActions(proposal).map((action) => (
                                                action.key === 'view' ? (
                                                    <Link
                                                        key={action.key}
                                                        to={`/admin/proposals/${proposal.id}`}
                                                        className={`p-2 rounded-lg transition-colors text-slate-500 hover:bg-white/5 hover:text-slate-200 ${action.color}`}
                                                        title={action.label}
                                                    >
                                                        <action.icon size={16} />
                                                    </Link>
                                                ) : (
                                                    <button
                                                        key={action.key}
                                                        onClick={() => handleAction(action.key, proposal)}
                                                        className={`p-2 rounded-lg transition-colors text-slate-500 hover:bg-white/5 hover:text-slate-200 ${action.color}`}
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
                            className="btn btn-secondary btn-sm flex items-center gap-1"
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
                                    className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="btn btn-secondary btn-sm flex items-center gap-1"
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
            {chairStage2Proposal && (
                <ChairStage2ReviewModal
                    proposal={chairStage2Proposal}
                    onClose={() => setChairStage2Proposal(null)}
                    onSuccess={() => { setChairStage2Proposal(null); loadData(); }}
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
