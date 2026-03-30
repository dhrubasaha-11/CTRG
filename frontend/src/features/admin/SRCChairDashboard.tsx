import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, Users, Clock, AlertTriangle,
    Calendar, Download, ChevronRight, RefreshCw,
    BarChart3, TrendingUp, CheckCircle2
} from 'lucide-react';
import { dashboardApi, proposalApi, cycleApi, type Proposal, type GrantCycle } from '../../services/api';
import { ActivityTimeline } from '../../components/dashboard/ActivityTimeline';
import { CycleProgress } from '../../components/dashboard/CycleProgress';
import { StatusChart } from '../../components/dashboard/StatusChart';

interface DashboardStats {
    total_proposals: number;
    pending_reviews: number;
    awaiting_decision: number;
    awaiting_revision: number;
    status_breakdown: Record<string, number>;
}

interface Activity {
    id: number;
    type: 'submission' | 'review' | 'decision' | 'revision';
    description: string;
    timestamp: string;
    user?: string;
}

const statCards = (stats: DashboardStats | null) => [
    {
        label: 'Total Proposals',
        value: stats?.total_proposals ?? 0,
        icon: FileText,
        accent: '#6366f1',
        iconBg: 'rgba(99,102,241,0.1)',
        iconColor: '#6366f1',
        glow: 'rgba(99,102,241,0.15)',
        trend: '+12%',
        trendColor: '#10b981',
    },
    {
        label: 'Pending Reviews',
        value: stats?.pending_reviews ?? 0,
        icon: Clock,
        accent: '#f59e0b',
        iconBg: 'rgba(245,158,11,0.1)',
        iconColor: '#d97706',
        glow: 'rgba(245,158,11,0.15)',
        trend: '',
        trendColor: '#10b981',
    },
    {
        label: 'Awaiting Decision',
        value: stats?.awaiting_decision ?? 0,
        icon: AlertTriangle,
        accent: '#8b5cf6',
        iconBg: 'rgba(139,92,246,0.1)',
        iconColor: '#8b5cf6',
        glow: 'rgba(139,92,246,0.15)',
        trend: '',
        trendColor: '#10b981',
    },
    {
        label: 'Awaiting Revision',
        value: stats?.awaiting_revision ?? 0,
        icon: RefreshCw,
        accent: '#f97316',
        iconBg: 'rgba(249,115,22,0.1)',
        iconColor: '#ea580c',
        glow: 'rgba(249,115,22,0.15)',
        trend: '',
        trendColor: '#10b981',
    },
];

const quickActions = [
    { label: 'Manage Grant Cycles', icon: Calendar,  path: '/admin/cycles',    color: '#6366f1' },
    { label: 'Manage Reviewers',    icon: Users,      path: '/admin/reviewers', color: '#8b5cf6' },
    { label: 'View All Proposals',  icon: FileText,   path: '/admin/proposals', color: '#06b6d4' },
    { label: 'Generate Reports',    icon: Download,   path: '/admin/reports',   color: '#10b981' },
];

const statusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
        SUBMITTED:                  'badge-brand',
        UNDER_STAGE_1_REVIEW:       'badge-violet',
        STAGE_1_REJECTED:           'badge-red',
        ACCEPTED_NO_CORRECTIONS:    'badge-green',
        TENTATIVELY_ACCEPTED:       'badge-amber',
        REVISION_REQUESTED:         'badge-orange',
        REVISED_PROPOSAL_SUBMITTED: 'badge-violet',
        UNDER_STAGE_2_REVIEW:       'badge-cyan',
        FINAL_ACCEPTED:             'badge-green',
        FINAL_REJECTED:             'badge-red',
    };
    return map[status] || 'badge-slate';
};

const SRCChairDashboard: React.FC = () => {
    const [stats, setStats]                   = useState<DashboardStats | null>(null);
    const [recentProposals, setRecentProposals] = useState<Proposal[]>([]);
    const [activities, setActivities]          = useState<Activity[]>([]);
    const [activeCycle, setActiveCycle]        = useState<GrantCycle | null>(null);
    const [loading, setLoading]                = useState(true);
    const [refreshing, setRefreshing]          = useState(false);

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [statsRes, proposalsRes, activitiesRes, cyclesRes] = await Promise.all([
                dashboardApi.getSrcChairStats(),
                proposalApi.getAll(),
                dashboardApi.getRecentActivities().catch(() => ({ data: [] })),
                cycleApi.getActive().catch(() => ({ data: [] })),
            ]);
            setStats(statsRes.data);
            setRecentProposals(Array.isArray(proposalsRes.data) ? proposalsRes.data.slice(0, 6) : []);
            setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
            const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
            setActiveCycle(cycles[0] ?? null);
        } catch {
            setStats({ total_proposals: 0, pending_reviews: 0, awaiting_decision: 0, awaiting_revision: 0, status_breakdown: {} });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => { setRefreshing(true); await loadDashboard(); setRefreshing(false); };

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    const cards = statCards(stats);

    return (
        <div className="space-y-6">

            {/* ── Hero Banner ── */}
            <div className="relative overflow-hidden rounded-2xl p-7"
                 style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 4px 24px rgba(99,102,241,0.2)' }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', left: '-40px', top: '-40px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: '5%', bottom: '-30px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1"
                             style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                                {activeCycle ? `Active: ${activeCycle.name}` : 'No Active Cycle'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                            Welcome back, SRC Chair
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        {(stats?.awaiting_decision ?? 0) > 0 && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
                                 style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.5)' }}>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                                <span className="text-xs font-semibold text-amber-200">
                                    {stats!.awaiting_decision} proposal{stats!.awaiting_decision > 1 ? 's' : ''} need your attention
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="btn flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="metric-card" style={{ borderTop: `3px solid ${card.accent}` }}>
                        {/* Subtle glow */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle, ${card.glow} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                        <div className="relative z-10 flex items-start justify-between gap-3">
                            <div>
                                <p className="section-label mb-2">{card.label}</p>
                                <p className="text-4xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.04em' }}>
                                    {card.value}
                                </p>
                                {card.trend && (
                                    <div className="mt-2 inline-flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                                        <span className="text-xs font-semibold text-emerald-600">{card.trend}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                 style={{ background: card.iconBg }}>
                                <card.icon className="h-5 w-5" style={{ color: card.iconColor }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Middle: Chart + Quick Actions + Activity ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Status Chart (2/3) */}
                <div className="lg:col-span-2 card p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-200">Proposal Status Distribution</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Overview of all proposals across stages</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-slate-600" />
                    </div>
                    <StatusChart data={stats?.status_breakdown ?? {}} />
                </div>

                {/* Quick Actions + Activity (1/3) */}
                <div className="flex flex-col gap-5">

                    {/* Quick Actions */}
                    <div className="card p-5">
                        <h3 className="section-label mb-3">Quick Actions</h3>
                        <div className="space-y-1.5">
                            {quickActions.map((action) => (
                                <Link key={action.path} to={action.path}
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group"
                                    style={{ border: '1px solid transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)', e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.borderColor = 'transparent')}>
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                                         style={{ background: `${action.color}20`, border: `1px solid ${action.color}30` }}>
                                        <action.icon className="h-4 w-4" style={{ color: action.color }} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{action.label}</span>
                                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="card p-5 flex-1">
                        <h3 className="section-label mb-3">Recent Activity</h3>
                        <ActivityTimeline activities={activities.slice(0, 5)} />
                    </div>
                </div>
            </div>

            {/* ── Recent Proposals ── */}
            <div className="card p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-200">Recent Proposals</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Latest submissions across all cycles</p>
                    </div>
                    <Link to="/admin/proposals" className="btn btn-ghost btn-sm flex items-center gap-1.5">
                        View All <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {recentProposals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                        <FileText className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">No proposals yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentProposals.map((p) => (
                            <div key={p.id} className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-150"
                                 style={{ border: '1px solid rgba(15,23,42,0.07)' }}
                                 onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                                 onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-slate-200">{p.proposal_code}</span>
                                        <span className={`badge ${statusBadgeClass(p.status)}`}>
                                            {p.status_display ?? p.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 truncate">{p.title}</p>
                                    <p className="text-xs text-slate-600 mt-0.5">{p.pi_name}</p>
                                </div>
                                <Link to={`/admin/proposals/${p.id}`} className="text-slate-600 hover:text-brand-400 transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Cycle Progress ── */}
            {activeCycle && (
                <CycleProgress
                    currentStage={
                        (stats?.status_breakdown?.UNDER_STAGE_2_REVIEW ?? 0) > 0 ? 'stage2' :
                        (stats?.awaiting_revision ?? 0) > 0 ? 'revision' : 'stage1'
                    }
                    stage1Complete={stats?.total_proposals ? Math.round(
                        ((stats.status_breakdown?.STAGE_1_REJECTED ?? 0) + (stats.status_breakdown?.ACCEPTED_NO_CORRECTIONS ?? 0) +
                         (stats.status_breakdown?.TENTATIVELY_ACCEPTED ?? 0) + (stats.status_breakdown?.FINAL_ACCEPTED ?? 0) +
                         (stats.status_breakdown?.FINAL_REJECTED ?? 0)) / stats.total_proposals * 100) : 0}
                    stage2Complete={stats?.total_proposals ? Math.round(
                        ((stats.status_breakdown?.FINAL_ACCEPTED ?? 0) + (stats.status_breakdown?.FINAL_REJECTED ?? 0)) / stats.total_proposals * 100) : 0}
                    stage1Date={activeCycle.stage1_review_start_date && activeCycle.stage1_review_end_date
                        ? `${activeCycle.stage1_review_start_date} – ${activeCycle.stage1_review_end_date}` : 'Not set'}
                    revisionDate={activeCycle.revision_window_days ? `${activeCycle.revision_window_days} day window` : 'Not set'}
                    stage2Date={activeCycle.stage2_review_start_date && activeCycle.stage2_review_end_date
                        ? `${activeCycle.stage2_review_start_date} – ${activeCycle.stage2_review_end_date}` : 'Not set'}
                    stats={{
                        stage1Proposals:   stats?.pending_reviews ?? 0,
                        revisionProposals: stats?.awaiting_revision ?? 0,
                        stage2Proposals:   stats?.status_breakdown?.UNDER_STAGE_2_REVIEW ?? 0,
                    }}
                />
            )}
        </div>
    );
};

export default SRCChairDashboard;
