/**
 * Enhanced PI Dashboard Component.
 * Shows PI's proposals with status tracking, actions, and notifications.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, Plus, Clock, CheckCircle, AlertTriangle, XCircle,
    Edit3, Eye, Upload, Calendar, ChevronRight, RefreshCw
} from 'lucide-react';
import { proposalApi, type Proposal } from '../../services/api';
import StatusTracker from './StatusTracker';

interface PIStats {
    total: number;
    drafts: number;
    under_review: number;
    pending_action: number;
    completed: number;
}

const PIDashboard: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [stats, setStats] = useState<PIStats>({ total: 0, drafts: 0, under_review: 0, pending_action: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setTick] = useState(0);

    useEffect(() => {
        loadProposals();
    }, []);

    // Live countdown timer - updates every minute
    useEffect(() => {
        const hasDeadlines = proposals.some(p => p.revision_deadline && ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED'].includes(p.status));
        if (!hasDeadlines) return;
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, [proposals]);

    const loadProposals = async () => {
        try {
            setLoading(true);
            const response = await proposalApi.getMyProposals();
            setProposals(response.data);

            // Calculate stats
            const drafts = response.data.filter(p => p.status === 'DRAFT').length;
            const underReview = response.data.filter(p =>
                ['SUBMITTED', 'UNDER_STAGE_1_REVIEW', 'UNDER_STAGE_2_REVIEW'].includes(p.status)
            ).length;
            const pendingAction = response.data.filter(p =>
                ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED'].includes(p.status)
            ).length;
            const completed = response.data.filter(p =>
                ['FINAL_ACCEPTED', 'FINAL_REJECTED', 'STAGE_1_REJECTED'].includes(p.status)
            ).length;

            setStats({ total: response.data.length, drafts, under_review: underReview, pending_action: pendingAction, completed });
        } catch (err) {
            console.error("Failed to load proposals:", err);
            setError("Failed to load proposals. Please try again.");
            setProposals([]); // Clear proposals on error
            setStats({ total: 0, drafts: 0, under_review: 0, pending_action: 0, completed: 0 }); // Reset stats on error
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Edit3 size={14} /> },
            SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={14} /> },
            UNDER_STAGE_1_REVIEW: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Clock size={14} /> },
            STAGE_1_REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14} /> },
            TENTATIVELY_ACCEPTED: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle size={14} /> },
            REVISION_REQUESTED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertTriangle size={14} /> },
            ACCEPTED_NO_CORRECTIONS: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={14} /> },
            REVISED_PROPOSAL_SUBMITTED: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: <RefreshCw size={14} /> },
            UNDER_STAGE_2_REVIEW: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Clock size={14} /> },
            FINAL_ACCEPTED: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={14} /> },
            FINAL_REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={14} /> },
        };
        return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
    };

    const getCountdown = useCallback((deadline: string) => {
        const now = new Date();
        const dl = new Date(deadline);
        const diff = dl.getTime() - now.getTime();
        if (diff <= 0) return { text: 'Deadline passed', urgent: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 2) return { text: `${days}d ${hours}h remaining`, urgent: false };
        if (days > 0) return { text: `${days}d ${hours}h remaining`, urgent: true };
        return { text: `${hours}h ${minutes}m remaining`, urgent: true };
    }, []);

    const needsAction = (status: string) => {
        return ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED', 'DRAFT'].includes(status);
    };

    const getActionButton = (proposal: Proposal) => {
        switch (proposal.status) {
            case 'DRAFT':
                return (
                    <Link
                        to={`/pi/proposals/${proposal.id}`}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Edit3 size={16} className="mr-2" />
                        Continue Editing
                    </Link>
                );
            case 'REVISION_REQUESTED':
            case 'TENTATIVELY_ACCEPTED':
                return (
                    <Link
                        to={`/pi/proposals/${proposal.id}/revise`}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        <Upload size={16} className="mr-2" />
                        Submit Revision
                    </Link>
                );
            default:
                return (
                    <Link
                        to={`/pi/proposals/${proposal.id}/view`}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        <Eye size={16} className="mr-2" />
                        View Details
                    </Link>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Proposals</h1>
                    <p className="text-gray-500 mt-1">Track and manage your research grant proposals</p>
                </div>
                <Link
                    to="/pi/submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Plus size={18} className="mr-2" />
                    New Proposal
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                    <p>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <FileText size={24} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Drafts</p>
                            <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
                        </div>
                        <Edit3 size={24} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Under Review</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.under_review}</p>
                        </div>
                        <Clock size={24} className="text-blue-400" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Action Needed</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.pending_action}</p>
                        </div>
                        <AlertTriangle size={24} className="text-orange-400" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                        </div>
                        <CheckCircle size={24} className="text-green-400" />
                    </div>
                </div>
            </div>

            {/* Proposals requiring action */}
            {proposals.filter(p => needsAction(p.status)).length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h2 className="font-semibold text-orange-800 mb-2">⚠️ Action Required</h2>
                    <div className="space-y-2">
                        {proposals.filter(p => needsAction(p.status)).map(p => {
                            const countdown = p.revision_deadline ? getCountdown(p.revision_deadline) : null;
                            return (
                                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                                    <div>
                                        <span className="font-medium text-gray-900">{p.title}</span>
                                        {countdown && (
                                            <span className={`ml-2 text-sm ${countdown.urgent ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                                                <Clock size={14} className="inline mr-1" />
                                                {countdown.text}
                                            </span>
                                        )}
                                    </div>
                                    {getActionButton(p)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Proposals List */}
            <div className="space-y-4">
                {proposals.map((proposal) => {
                    const statusStyle = getStatusBadge(proposal.status);
                    return (
                        <div
                            key={proposal.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        {proposal.proposal_code && (
                                            <span className="text-sm font-mono text-gray-500">{proposal.proposal_code}</span>
                                        )}
                                        <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                            {statusStyle.icon}
                                            <span className="ml-1">{proposal.status_display || proposal.status.replace(/_/g, ' ')}</span>
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">{proposal.title}</h3>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                        <span>{proposal.cycle_name}</span>
                                        <span>•</span>
                                        <span>${proposal.fund_requested?.toLocaleString()}</span>
                                        {proposal.approved_amount && (
                                            <>
                                                <span>•</span>
                                                <span className="text-green-600 font-medium">
                                                    Approved: ${proposal.approved_amount.toLocaleString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {getActionButton(proposal)}
                                    <ChevronRight size={20} className="text-gray-400" />
                                </div>
                            </div>

                            {/* Status Tracker for non-draft proposals */}
                            {proposal.status !== 'DRAFT' && (
                                <StatusTracker status={proposal.status} />
                            )}
                        </div>
                    );
                })}

                {proposals.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
                        <p className="text-gray-500 mb-4">Start by creating your first research grant proposal</p>
                        <Link
                            to="/pi/submit"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} className="mr-2" />
                            Create Proposal
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PIDashboard;
