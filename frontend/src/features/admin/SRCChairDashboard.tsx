/**
 * SRC Chair Dashboard Component.
 *
 * The primary landing page for the SRC Chair role. Displays:
 * - Summary stat cards (total proposals, pending reviews, awaiting decision/revision)
 * - Proposal status distribution chart
 * - Quick-action links to management pages
 * - Recent activity timeline
 * - Recent proposals list with status badges
 * - Grant cycle progress indicator
 *
 * Data is loaded from two parallel API calls (stats + proposals) on mount,
 * with a manual refresh button. On API failure, the dashboard degrades
 * gracefully by showing zeroed-out stats rather than an error screen.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, Users, Clock, AlertTriangle,
    Calendar, Download, ChevronRight, RefreshCw,
    BarChart3
} from 'lucide-react';
import { dashboardApi, proposalApi, cycleApi, type Proposal, type GrantCycle } from '../../services/api';
import { ActivityTimeline } from '../../components/dashboard/ActivityTimeline';
import { CycleProgress } from '../../components/dashboard/CycleProgress';
import { StatusChart } from '../../components/dashboard/StatusChart';

/** Matches the backend DashboardStatsSerializer shape. */
interface DashboardStats {
    total_proposals: number;
    pending_reviews: number;
    awaiting_decision: number;
    awaiting_revision: number;
    /** Maps status strings (e.g., "SUBMITTED") to their counts */
    status_breakdown: Record<string, number>;
}

interface Activity {
    id: number;
    type: 'submission' | 'review' | 'decision' | 'revision';
    description: string;
    timestamp: string;
    user?: string;
}

const SRCChairDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentProposals, setRecentProposals] = useState<Proposal[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activeCycle, setActiveCycle] = useState<GrantCycle | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const [statsRes, proposalsRes, activitiesRes, cyclesRes] = await Promise.all([
                dashboardApi.getSrcChairStats(),
                proposalApi.getAll(),
                dashboardApi.getRecentActivities().catch(() => ({ data: [] })),
                cycleApi.getActive().catch(() => ({ data: [] })),
            ]);
            setStats(statsRes.data);
            setRecentProposals(Array.isArray(proposalsRes.data) ? proposalsRes.data.slice(0, 5) : []);
            setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
            const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
            setActiveCycle(cycles.length > 0 ? cycles[0] : null);
        } catch {
            setStats({
                total_proposals: 0,
                pending_reviews: 0,
                awaiting_decision: 0,
                awaiting_revision: 0,
                status_breakdown: {}
            });
            setRecentProposals([]);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    };

    // Dashboard stat cards — each maps to a key from DashboardStats.
    // cssColor is used for the decorative background blur; bgColor for Tailwind classes.
    const statusCards = [
        { label: 'Total Proposals', value: stats?.total_proposals || 0, icon: FileText, bgColor: 'bg-blue-500', cssColor: '#3b82f6' },
        { label: 'Pending Reviews', value: stats?.pending_reviews || 0, icon: Clock, bgColor: 'bg-yellow-500', cssColor: '#eab308' },
        { label: 'Awaiting Decision', value: stats?.awaiting_decision || 0, icon: AlertTriangle, bgColor: 'bg-purple-500', cssColor: '#a855f7' },
        { label: 'Awaiting Revision', value: stats?.awaiting_revision || 0, icon: RefreshCw, bgColor: 'bg-orange-500', cssColor: '#f97316' },
    ];

    const quickActions = [
        { label: 'Manage Grant Cycles', icon: Calendar, path: '/admin/cycles', color: 'bg-indigo-600' },
        { label: 'Manage Reviewers', icon: Users, path: '/admin/reviewers', color: 'bg-teal-600' },
        { label: 'View All Proposals', icon: FileText, path: '/admin/proposals', color: 'bg-blue-600' },
        { label: 'Generate Reports', icon: Download, path: '/admin/reports', color: 'bg-purple-600' },
    ];

    /**
     * Map proposal status enum values to Tailwind CSS badge classes.
     * Colors follow a semantic convention: blue=in-progress, green=accepted,
     * red=rejected, orange/yellow=needs-attention. Falls back to gray for
     * any unrecognized status (e.g., future status values).
     */
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            SUBMITTED: 'bg-blue-100 text-blue-800',
            UNDER_STAGE_1_REVIEW: 'bg-indigo-100 text-indigo-800',
            TENTATIVELY_ACCEPTED: 'bg-yellow-100 text-yellow-800',
            REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
            UNDER_STAGE_2_REVIEW: 'bg-cyan-100 text-cyan-800',
            FINAL_ACCEPTED: 'bg-green-100 text-green-800',
            FINAL_REJECTED: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
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
            {/* Hero Welcome Section */}
            <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 text-white overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">Welcome back, SRC Chair</h1>
                            <p className="text-blue-200 mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                                <span className="text-sm font-medium">
                                    {activeCycle ? `Active Cycle: ${activeCycle.name}` : 'No Active Cycle'}
                                </span>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-4 py-2 rounded-lg inline-flex">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-medium">{stats?.awaiting_decision || 0} proposals need your attention</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statusCards.map((card, idx) => (
                    <div key={idx} className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:scale-[1.02] transition-all overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl" style={{ backgroundColor: card.cssColor }} />
                        </div>

                        {/* Left accent bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${card.bgColor}`} />

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                                <p className="text-4xl font-bold text-gray-900 mt-2">{card.value}</p>
                            </div>
                            <div className={`p-3 ${card.bgColor} rounded-lg`}>
                                <card.icon size={24} className="text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two-Column Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Status Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Proposal Status Distribution</h2>
                        <BarChart3 size={20} className="text-gray-400" />
                    </div>
                    <StatusChart data={stats?.status_breakdown || {}} />
                </div>

                {/* Right: Actions & Timeline (1/3 width) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                    <div className="space-y-2 mb-6">
                        {quickActions.map((action, idx) => (
                            <Link
                                key={idx}
                                to={action.path}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                                <div className={`p-2 ${action.color} rounded-lg group-hover:scale-110 transition-transform`}>
                                    <action.icon size={16} className="text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{action.label}</span>
                            </Link>
                        ))}
                    </div>

                    <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-6 pt-6 border-t border-gray-200">Recent Activity</h3>
                    <ActivityTimeline activities={activities.slice(0, 4)} />
                </div>
            </div>

            {/* Recent Proposals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Proposals</h2>
                    <Link to="/admin/proposals" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                        View All <ChevronRight size={16} />
                    </Link>
                </div>
                <div className="space-y-3">
                    {recentProposals.map((proposal) => (
                        <div key={proposal.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            {/* Status dot */}
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${proposal.status === 'FINAL_ACCEPTED' ? 'bg-green-500' :
                                    proposal.status === 'FINAL_REJECTED' ? 'bg-red-500' :
                                        proposal.status === 'REVISION_REQUESTED' ? 'bg-orange-500' :
                                            'bg-blue-500'
                                }`} />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900 truncate">{proposal.proposal_code}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                                        {proposal.status_display || proposal.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{proposal.title}</p>
                                <p className="text-xs text-gray-400">{proposal.pi_name}</p>
                            </div>
                            <Link to={`/admin/proposals/${proposal.id}`} className="ml-4 text-gray-400 hover:text-blue-600">
                                <ChevronRight size={20} />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cycle Progress Footer */}
            {activeCycle && (
                <CycleProgress
                    currentStage={
                        (stats?.status_breakdown?.UNDER_STAGE_2_REVIEW || 0) > 0 ? 'stage2' :
                        (stats?.awaiting_revision || 0) > 0 ? 'revision' : 'stage1'
                    }
                    stage1Complete={stats?.total_proposals ? Math.round(((stats.status_breakdown?.STAGE_1_REJECTED || 0) + (stats.status_breakdown?.ACCEPTED_NO_CORRECTIONS || 0) + (stats.status_breakdown?.TENTATIVELY_ACCEPTED || 0) + (stats.status_breakdown?.FINAL_ACCEPTED || 0) + (stats.status_breakdown?.FINAL_REJECTED || 0)) / stats.total_proposals * 100) : 0}
                    stage2Complete={stats?.total_proposals ? Math.round(((stats.status_breakdown?.FINAL_ACCEPTED || 0) + (stats.status_breakdown?.FINAL_REJECTED || 0)) / stats.total_proposals * 100) : 0}
                    stage1Date={activeCycle.stage1_review_start_date && activeCycle.stage1_review_end_date ? `${activeCycle.stage1_review_start_date} - ${activeCycle.stage1_review_end_date}` : 'Not set'}
                    revisionDate={activeCycle.revision_window_days ? `${activeCycle.revision_window_days} day window` : 'Not set'}
                    stage2Date={activeCycle.stage2_review_start_date && activeCycle.stage2_review_end_date ? `${activeCycle.stage2_review_start_date} - ${activeCycle.stage2_review_end_date}` : 'Not set'}
                    stats={{
                        stage1Proposals: stats?.pending_reviews || 0,
                        revisionProposals: stats?.awaiting_revision || 0,
                        stage2Proposals: stats?.status_breakdown?.UNDER_STAGE_2_REVIEW || 0,
                    }}
                />
            )}
        </div>
    );
};

export default SRCChairDashboard;
