/**
 * Proposal List Component for SRC Chair.
 * View all proposals with filtering, search, and actions.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Eye, Plus, UserPlus, CheckSquare, FileText, Mail, Clock } from 'lucide-react';
import { proposalApi, assignmentApi, type Proposal, cycleApi, type GrantCycle } from '../../services/api';
import ReviewerAssignmentModal from './ReviewerAssignmentModal';
import Stage1DecisionModal from './Stage1DecisionModal';
import FinalDecisionModal from './FinalDecisionModal';

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

    // Modal states
    const [assignModalProposal, setAssignModalProposal] = useState<Proposal | null>(null);
    const [stage1DecisionProposal, setStage1DecisionProposal] = useState<Proposal | null>(null);
    const [finalDecisionProposal, setFinalDecisionProposal] = useState<Proposal | null>(null);

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
            p.proposal_code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || p.status === statusFilter;
        const matchesCycle = !cycleFilter || p.cycle.toString() === cycleFilter;
        return matchesSearch && matchesStatus && matchesCycle;
    });

    const handleDownloadReport = async (proposal: Proposal) => {
        try {
            const response = await proposalApi.downloadReport(proposal.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `review_report_${proposal.proposal_code}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            alert('Failed to download report. Please try again.');
        }
    };

    const getAvailableActions = (proposal: Proposal) => {
        const actions = [];

        // Assign reviewers for submitted proposals
        if (['SUBMITTED'].includes(proposal.status)) {
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
        }

        // Final decision for Stage 2 completed
        if (['UNDER_STAGE_2_REVIEW'].includes(proposal.status)) {
            actions.push({ key: 'final', label: 'Final Decision', icon: CheckSquare, color: 'text-emerald-600' });
        }

        // Always show view and report
        actions.push({ key: 'view', label: 'View Details', icon: Eye, color: 'text-gray-600' });
        actions.push({ key: 'report', label: 'Download Report', icon: Download, color: 'text-gray-600' });

        return actions;
    };

    const handleNotifyReviewers = async (proposal: Proposal) => {
        try {
            const response = await proposalApi.getReviews(proposal.id);
            const assignments = response.data;
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
            case 'view':
                // Navigate to detail view
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
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProposals.map((proposal) => (
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
                                            {getAvailableActions(proposal).slice(0, 3).map((action) => (
                                                <button
                                                    key={action.key}
                                                    onClick={() => handleAction(action.key, proposal)}
                                                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${action.color}`}
                                                    title={action.label}
                                                >
                                                    <action.icon size={16} />
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
        </div>
    );
};

export default ProposalList;
