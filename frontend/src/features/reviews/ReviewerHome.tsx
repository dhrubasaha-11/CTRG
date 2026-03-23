import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, FileText, ArrowRight, AlertTriangle, Star } from 'lucide-react';
import { dashboardApi, type ReviewAssignment } from '../../services/api';

interface ReviewerDashboardData {
    total_assigned: number;
    pending: number;
    completed: number;
    pending_assignments: ReviewAssignment[];
}

const stageLabel = (stage: number) => stage === 1 ? 'Stage 1' : 'Stage 2';

const ReviewerHome: React.FC = () => {
    const [data, setData] = useState<ReviewerDashboardData>({ total_assigned: 0, pending: 0, completed: 0, pending_assignments: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await dashboardApi.getReviewerStats();
                setData(res.data);
            } catch { /* graceful */ } finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;
    }

    const completionRate = data.total_assigned > 0 ? Math.round((data.completed / data.total_assigned) * 100) : 0;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100" style={{ letterSpacing: '-0.02em' }}>Reviewer Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Overview of your review workload and next actions</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    {
                        label: 'Total Assigned',
                        value: data.total_assigned,
                        icon: FileText,
                        color: '#818cf8',
                        bg: 'rgba(99,102,241,0.15)',
                        border: 'rgba(99,102,241,0.25)',
                        glow: 'rgba(99,102,241,0.2)',
                    },
                    {
                        label: 'Pending Reviews',
                        value: data.pending,
                        icon: Clock3,
                        color: '#fcd34d',
                        bg: 'rgba(245,158,11,0.15)',
                        border: 'rgba(245,158,11,0.25)',
                        glow: 'rgba(245,158,11,0.2)',
                    },
                    {
                        label: 'Completed',
                        value: data.completed,
                        icon: CheckCircle2,
                        color: '#6ee7b7',
                        bg: 'rgba(16,185,129,0.15)',
                        border: 'rgba(16,185,129,0.25)',
                        glow: 'rgba(16,185,129,0.2)',
                    },
                ].map((card) => (
                    <div key={card.label} className="metric-card">
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle, ${card.glow} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                        <div className="relative z-10 flex items-start justify-between gap-3">
                            <div>
                                <p className="section-label mb-2">{card.label}</p>
                                <p className="text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.04em' }}>{card.value}</p>
                            </div>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                 style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                                <card.icon className="h-5 w-5" style={{ color: card.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Completion Bar */}
            <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-brand-400" />
                        <span className="text-sm font-semibold text-slate-300">Completion Rate</span>
                    </div>
                    <span className="text-sm font-bold text-brand-300">{completionRate}%</span>
                </div>
                <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${completionRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-600">{data.completed} of {data.total_assigned} reviews completed</p>
            </div>

            {/* Pending Reviews */}
            {data.pending_assignments && data.pending_assignments.length > 0 ? (
                <div className="card p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-200">Pending Reviews</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Proposals waiting for your evaluation</p>
                        </div>
                        <span className="badge badge-amber">{data.pending} pending</span>
                    </div>
                    <div className="space-y-2">
                        {data.pending_assignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all"
                                 style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                                 onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                 onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                                     style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <FileText className="h-4 w-4 text-brand-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-200 truncate">{assignment.proposal_code}</span>
                                        <span className="badge badge-brand">{stageLabel(assignment.stage)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{assignment.proposal_title}</p>
                                    {assignment.deadline && (
                                        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
                                            <AlertTriangle className="h-3 w-3" />
                                            Due: {new Date(assignment.deadline).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <Link
                                    to={assignment.stage === 2 ? `/reviewer/reviews/${assignment.id}/stage2` : `/reviewer/reviews/${assignment.id}`}
                                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                                >
                                    Review <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card p-10 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3 opacity-60" />
                    <h3 className="text-base font-semibold text-slate-300">All caught up!</h3>
                    <p className="mt-1 text-sm text-slate-500">You have no pending reviews at this time.</p>
                </div>
            )}

            {/* Quick link */}
            <div>
                <Link to="/reviewer/reviews" className="btn btn-secondary flex items-center justify-center gap-2 w-full">
                    View All My Reviews <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
};

export default ReviewerHome;
