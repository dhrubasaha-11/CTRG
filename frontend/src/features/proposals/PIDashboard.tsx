import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, Plus, Clock, CheckCircle, AlertTriangle, XCircle,
    Edit3, Eye, Upload, ChevronRight, RefreshCw
} from 'lucide-react';
import { proposalApi, type Proposal } from '../../services/api';
import StatusTracker from './StatusTracker';

interface PIStats {
    submitted_proposals: number;
    revision_deadlines: number;
    final_decisions: number;
    under_review: number;
    pending_action: number;
}

const statusBadgeMap: Record<string, { cls: string; label: string }> = {
    DRAFT:                        { cls: 'badge-slate',   label: 'Draft' },
    SUBMITTED:                    { cls: 'badge-brand',   label: 'Submitted' },
    UNDER_STAGE_1_REVIEW:         { cls: 'badge-amber',   label: 'Stage 1 Review' },
    STAGE_1_REJECTED:             { cls: 'badge-red',     label: 'Stage 1 Rejected' },
    TENTATIVELY_ACCEPTED:         { cls: 'badge-amber',   label: 'Tentatively Accepted' },
    REVISION_REQUESTED:           { cls: 'badge-orange',  label: 'Revision Requested' },
    ACCEPTED_NO_CORRECTIONS:      { cls: 'badge-green',   label: 'Accepted' },
    REVISED_PROPOSAL_SUBMITTED:   { cls: 'badge-violet',  label: 'Revised Submitted' },
    UNDER_STAGE_2_REVIEW:         { cls: 'badge-cyan',    label: 'Stage 2 Review' },
    FINAL_ACCEPTED:               { cls: 'badge-green',   label: 'Final Accepted' },
    FINAL_REJECTED:               { cls: 'badge-red',     label: 'Final Rejected' },
    REVISION_DEADLINE_MISSED:     { cls: 'badge-red',     label: 'Deadline Missed' },
};

const PIDashboard: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [stats, setStats] = useState<PIStats>({ submitted_proposals: 0, revision_deadlines: 0, final_decisions: 0, under_review: 0, pending_action: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setTick] = useState(0);

    useEffect(() => { loadProposals(); }, []);

    useEffect(() => {
        const hasDeadlines = proposals.some(p => p.revision_deadline && ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED'].includes(p.status));
        if (!hasDeadlines) return;
        const t = setInterval(() => setTick(n => n + 1), 60000);
        return () => clearInterval(t);
    }, [proposals]);

    const loadProposals = async () => {
        try {
            setLoading(true);
            const res = await proposalApi.getMyProposals();
            setProposals(res.data);
            setStats({
                submitted_proposals: res.data.filter(p => p.status !== 'DRAFT').length,
                revision_deadlines:  res.data.filter(p => Boolean(p.revision_deadline) && ['REVISION_REQUESTED', 'REVISION_DEADLINE_MISSED'].includes(p.status)).length,
                under_review:        res.data.filter(p => ['SUBMITTED', 'UNDER_STAGE_1_REVIEW', 'UNDER_STAGE_2_REVIEW'].includes(p.status)).length,
                pending_action:      res.data.filter(p => ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED'].includes(p.status)).length,
                final_decisions:     res.data.filter(p => ['ACCEPTED_NO_CORRECTIONS', 'STAGE_1_REJECTED', 'FINAL_ACCEPTED', 'FINAL_REJECTED'].includes(p.status)).length,
            });
        } catch {
            setError('Failed to load proposals. Please try again.');
        } finally { setLoading(false); }
    };

    const getCountdown = useCallback((deadline: string) => {
        const diff = new Date(deadline).getTime() - Date.now();
        if (diff <= 0) return { text: 'Deadline passed', urgent: true };
        const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
        return { text: d > 0 ? `${d}d ${h}h remaining` : `${h}h remaining`, urgent: d < 2 };
    }, []);

    const needsAction = (s: string) => ['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED', 'DRAFT'].includes(s);

    const ActionBtn = ({ proposal }: { proposal: Proposal }) => {
        if (proposal.status === 'DRAFT')
            return <Link to={`/pi/proposals/${proposal.id}`} className="btn btn-primary btn-sm flex items-center gap-1.5"><Edit3 size={14} />Continue Editing</Link>;
        if (['REVISION_REQUESTED', 'TENTATIVELY_ACCEPTED'].includes(proposal.status))
            return <Link to={`/pi/proposals/${proposal.id}/revise`} className="btn btn-sm flex items-center gap-1.5" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fdba74' }}><Upload size={14} />Submit Revision</Link>;
        return <Link to={`/pi/proposals/${proposal.id}/view`} className="btn btn-secondary btn-sm flex items-center gap-1.5"><Eye size={14} />View</Link>;
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;

    const statCards = [
        { label: 'Submitted',       value: stats.submitted_proposals, icon: FileText,      color: '#6366f1', bg: 'rgba(99,102,241,0.1)',    border: 'rgba(99,102,241,0.2)',    glow: 'rgba(99,102,241,0.12)', accent: '#6366f1' },
        { label: 'Under Review',    value: stats.under_review,        icon: Clock,          color: '#0891b2', bg: 'rgba(6,182,212,0.1)',     border: 'rgba(6,182,212,0.2)',     glow: 'rgba(6,182,212,0.12)',  accent: '#06b6d4' },
        { label: 'Action Needed',   value: stats.pending_action,      icon: AlertTriangle,  color: '#d97706', bg: 'rgba(245,158,11,0.1)',    border: 'rgba(245,158,11,0.2)',    glow: 'rgba(245,158,11,0.12)', accent: '#f59e0b' },
        { label: 'Rev. Deadlines',  value: stats.revision_deadlines,  icon: RefreshCw,      color: '#ea580c', bg: 'rgba(249,115,22,0.1)',    border: 'rgba(249,115,22,0.2)',    glow: 'rgba(249,115,22,0.12)', accent: '#f97316' },
        { label: 'Final Decisions', value: stats.final_decisions,     icon: CheckCircle,    color: '#059669', bg: 'rgba(16,185,129,0.1)',    border: 'rgba(16,185,129,0.2)',    glow: 'rgba(16,185,129,0.12)', accent: '#10b981' },
    ];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>My Proposals</h1>
                    <p className="mt-1 text-sm text-slate-500">Track and manage your research grant proposals</p>
                </div>
                <Link to="/pi/submit" className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    New Proposal
                </Link>
            </div>

            {error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
                    {error}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {statCards.map((c) => (
                    <div key={c.label} className="metric-card" style={{ borderTop: `3px solid ${c.accent}` }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '70px', height: '70px', background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
                        <div className="relative z-10">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3"
                                 style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                                <c.icon className="h-4 w-4" style={{ color: c.color }} />
                            </div>
                            <p className="text-3xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.04em' }}>{c.value}</p>
                            <p className="section-label mt-1">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Required Banner */}
            {proposals.filter(p => needsAction(p.status)).length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Action Required</h2>
                    </div>
                    <div className="space-y-2">
                        {proposals.filter(p => needsAction(p.status)).map(p => {
                            const cd = p.revision_deadline ? getCountdown(p.revision_deadline) : null;
                            return (
                                <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                                     style={{ background: 'rgba(254,243,199,0.6)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <div className="min-w-0">
                                        <span className="text-sm font-semibold text-slate-800 truncate block">{p.title}</span>
                                        {cd && (
                                            <span className={`mt-0.5 flex items-center gap-1 text-xs ${cd.urgent ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                                <Clock size={11} /> {cd.text}
                                            </span>
                                        )}
                                    </div>
                                    <ActionBtn proposal={p} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Proposal List */}
            <div className="space-y-3">
                {proposals.map((proposal) => {
                    const bm = statusBadgeMap[proposal.status] || { cls: 'badge-slate', label: proposal.status };
                    return (
                        <div key={proposal.id} className="card p-5 hover:border-brand-500/30">
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        {proposal.proposal_code && (
                                            <span className="font-mono text-xs text-slate-500">{proposal.proposal_code}</span>
                                        )}
                                        <span className={`badge ${bm.cls}`}>
                                            {proposal.status_display || bm.label}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-800 truncate">{proposal.title}</h3>
                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                        {proposal.cycle_name && <span>{proposal.cycle_name}</span>}
                                        {proposal.fund_requested && (
                                            <span>Requested: <strong className="text-slate-700">${proposal.fund_requested.toLocaleString()}</strong></span>
                                        )}
                                        {proposal.approved_amount && (
                                            <span className="text-emerald-700 font-semibold">
                                                Approved: ${proposal.approved_amount.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <ActionBtn proposal={proposal} />
                                </div>
                            </div>
                            {proposal.status !== 'DRAFT' && (
                                <div style={{ borderTop: '1px solid rgba(15,23,42,0.08)', paddingTop: '14px' }}>
                                    <StatusTracker status={proposal.status} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {proposals.length === 0 && (
                    <div className="card p-14 flex flex-col items-center justify-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
                             style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <FileText className="h-7 w-7 text-brand-400 opacity-70" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 mb-1">No proposals yet</h3>
                        <p className="text-sm text-slate-500 mb-5">Start by creating your first research grant proposal</p>
                        <Link to="/pi/submit" className="btn btn-primary flex items-center gap-2">
                            <Plus size={16} />Create Proposal
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PIDashboard;
