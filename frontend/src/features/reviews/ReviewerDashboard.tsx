import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, FileText, AlertCircle, Calendar, ChevronRight, Eye, Edit3 } from 'lucide-react';
import { assignmentApi, type ReviewAssignment } from '../../services/api';

interface ReviewerStats { total_assignments: number; pending: number; completed: number; overdue: number; }

const badgeStatus: Record<string, string> = {
    PENDING:   'badge-amber',
    COMPLETED: 'badge-green',
};
const badgeOutcome: Record<string, string> = {
    STAGE_1_REJECTED:        'badge-red',
    ACCEPTED_NO_CORRECTIONS: 'badge-green',
    TENTATIVELY_ACCEPTED:    'badge-amber',
    REVISION_REQUESTED:      'badge-orange',
    FINAL_ACCEPTED:          'badge-green',
    FINAL_REJECTED:          'badge-red',
};

const ReviewerDashboard: React.FC = () => {
    const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
    const [stats, setStats]   = useState<ReviewerStats>({ total_assignments: 0, pending: 0, completed: 0, overdue: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        const id = window.setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        setStats(prev => ({ ...prev, overdue: assignments.filter(a => a.status === 'PENDING' && new Date(a.deadline).getTime() < currentTime).length }));
    }, [assignments, currentTime]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await assignmentApi.getAll();
            setAssignments(res.data);
            setStats({
                total_assignments: res.data.length,
                pending:   res.data.filter(a => a.status === 'PENDING').length,
                completed: res.data.filter(a => a.status === 'COMPLETED').length,
                overdue:   res.data.filter(a => a.status === 'PENDING' && new Date(a.deadline) < new Date()).length,
            });
        } catch { setAssignments([]); } finally { setLoading(false); }
    };

    const isOverdue = (deadline: string, status: string) => status === 'PENDING' && new Date(deadline).getTime() < currentTime;
    const getDaysLeft = (deadline: string) => Math.ceil((new Date(deadline).getTime() - currentTime) / 86400000);
    const filtered = assignments.filter(a => filter === 'pending' ? a.status === 'PENDING' : filter === 'completed' ? a.status === 'COMPLETED' : true);

    if (loading) return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;

    const statCards = [
        { label: 'Assigned',  value: stats.total_assignments, icon: FileText,    color: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.25)', glow: 'rgba(99,102,241,0.2)' },
        { label: 'Pending',   value: stats.pending,           icon: Clock,       color: '#fcd34d', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.2)' },
        { label: 'Completed', value: stats.completed,         icon: CheckCircle2,color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.2)' },
        { label: 'Overdue',   value: stats.overdue,           icon: AlertCircle, color: '#fca5a5', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.2)' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800" style={{ letterSpacing: '-0.02em' }}>My Reviews</h1>
                <p className="mt-1 text-sm text-slate-500">Manage and complete your assigned proposal reviews</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCards.map((c) => (
                    <div key={c.label} className="metric-card">
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '70px', height: '70px', background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <p className="section-label mb-2">{c.label}</p>
                                <p className="text-3xl font-extrabold text-white" style={{ letterSpacing: '-0.04em' }}>{c.value}</p>
                            </div>
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                                <c.icon className="h-5 w-5" style={{ color: c.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
                {(['all', 'pending', 'completed'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className="px-4 py-2.5 text-sm font-medium transition-colors relative"
                        style={{ color: filter === f ? '#a5b4fc' : '#475569', borderBottom: filter === f ? '2px solid #6366f1' : '2px solid transparent' }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? assignments.length : f === 'pending' ? stats.pending : stats.completed})
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            <div className="table-wrap">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-slate-600">
                        <FileText className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">No assignments found</p>
                    </div>
                ) : (
                    <div style={{ borderRadius: 'inherit', overflow: 'hidden' }}>
                        {filtered.map((assignment, idx) => {
                            const overdue = isOverdue(assignment.deadline, assignment.status);
                            const daysLeft = getDaysLeft(assignment.deadline);
                            const started = (assignment.stage === 1 && assignment.stage1_score) || (assignment.stage === 2 && assignment.stage2_review);
                            return (
                                <div key={assignment.id} className="p-4 transition-colors"
                                     style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                                     onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                     onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs text-slate-500">{assignment.proposal_code}</span>
                                                <span className={`badge ${badgeStatus[assignment.status] || 'badge-slate'}`}>{assignment.status_display}</span>
                                                {assignment.review_validity_display && (
                                                    <span className={`badge ${assignment.review_validity === 'REJECTED' ? 'badge-red' : 'badge-green'}`}>{assignment.review_validity_display}</span>
                                                )}
                                                <span className="badge badge-violet">{assignment.stage_display}</span>
                                                {overdue && <span className="badge badge-red">Overdue</span>}
                                                {assignment.proposal_status_display && (
                                                    <span className={`badge ${badgeOutcome[assignment.proposal_status ?? ''] || 'badge-slate'}`}>{assignment.proposal_status_display}</span>
                                                )}
                                            </div>
                                            <h3 className="mt-1.5 text-sm font-semibold text-slate-800">{assignment.proposal_title}</h3>
                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
                                                {!overdue && assignment.status !== 'COMPLETED' && (
                                                    <span className={daysLeft <= 3 ? 'text-red-400 font-semibold' : 'text-slate-500'}>
                                                        ({daysLeft > 0 ? `${daysLeft}d left` : 'Due today'})
                                                    </span>
                                                )}
                                            </div>
                                            {assignment.review_validity === 'REJECTED' && assignment.chair_rejection_reason && (
                                                <p className="mt-1.5 text-xs text-red-400">Chair: {assignment.chair_rejection_reason}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {assignment.status === 'COMPLETED' ? (
                                                <Link to={`/reviewer/reviews/${assignment.id}/view`} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                                                    <Eye className="h-3.5 w-3.5" />View
                                                </Link>
                                            ) : (
                                                <Link to={assignment.stage === 2 ? `/reviewer/reviews/${assignment.id}/stage2` : `/reviewer/reviews/${assignment.id}`}
                                                      className="btn btn-primary btn-sm flex items-center gap-1.5">
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                    {started ? 'Continue' : 'Start Review'}
                                                </Link>
                                            )}
                                            <ChevronRight className="h-5 w-5 text-slate-700" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewerDashboard;
