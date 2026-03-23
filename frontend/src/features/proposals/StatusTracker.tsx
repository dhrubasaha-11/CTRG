import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface StatusTrackerProps { status: string; }

const STEPS = [
    { key: 'SUBMITTED',         label: 'Submitted',    short: 'Submitted' },
    { key: 'UNDER_STAGE_1_REVIEW', label: 'Stage 1',  short: 'Stage 1' },
    { key: 'STAGE_1_DECISION',  label: 'Decision',     short: 'Decision' },
    { key: 'REVISION',          label: 'Revision',     short: 'Revision' },
    { key: 'UNDER_STAGE_2_REVIEW', label: 'Stage 2',  short: 'Stage 2' },
    { key: 'FINAL_DECISION',    label: 'Final',        short: 'Final' },
];

const STATUS_MAP: Record<string, { step: number; state: 'completed' | 'current' | 'pending' | 'rejected' | 'warning' }> = {
    SUBMITTED:                    { step: 0, state: 'current' },
    UNDER_STAGE_1_REVIEW:         { step: 1, state: 'current' },
    STAGE_1_REJECTED:             { step: 2, state: 'rejected' },
    ACCEPTED_NO_CORRECTIONS:      { step: 2, state: 'completed' },
    TENTATIVELY_ACCEPTED:         { step: 2, state: 'warning' },
    REVISION_REQUESTED:           { step: 3, state: 'warning' },
    REVISED_PROPOSAL_SUBMITTED:   { step: 3, state: 'current' },
    REVISION_DEADLINE_MISSED:     { step: 3, state: 'rejected' },
    UNDER_STAGE_2_REVIEW:         { step: 4, state: 'current' },
    FINAL_ACCEPTED:               { step: 5, state: 'completed' },
    FINAL_REJECTED:               { step: 5, state: 'rejected' },
};

const stepConfig = {
    completed: { bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.5)', color: '#6ee7b7', lineColor: '#10b981', icon: <CheckCircle2 size={15} />, labelColor: '#6ee7b7' },
    current:   { bg: 'rgba(99,102,241,0.2)', border: 'rgba(99,102,241,0.6)', color: '#a5b4fc', lineColor: 'rgba(255,255,255,0.08)', icon: <Clock size={15} className="animate-pulse" />, labelColor: '#818cf8' },
    warning:   { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.5)', color: '#fcd34d', lineColor: 'rgba(255,255,255,0.08)', icon: <AlertTriangle size={15} />, labelColor: '#fcd34d' },
    rejected:  { bg: 'rgba(239,68,68,0.2)',  border: 'rgba(239,68,68,0.5)',  color: '#fca5a5', lineColor: 'rgba(255,255,255,0.08)', icon: <XCircle size={15} />, labelColor: '#fca5a5' },
    pending:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: '#475569', lineColor: 'rgba(255,255,255,0.06)', icon: null, labelColor: '#475569' },
};

const currentStateBadge = {
    completed: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#6ee7b7' },
    current:   { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc' },
    warning:   { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fcd34d' },
    rejected:  { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#fca5a5' },
    pending:   { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', color: '#64748b' },
};

const StatusTracker: React.FC<StatusTrackerProps> = ({ status }) => {
    const info = STATUS_MAP[status] || { step: 0, state: 'pending' as const };

    const getState = (idx: number) => {
        if (idx < info.step) return 'completed';
        if (idx === info.step) return info.state;
        return 'pending';
    };

    const badgeStyle = currentStateBadge[info.state] || currentStateBadge.pending;

    return (
        <div>
            <div className="flex items-center justify-between">
                {STEPS.map((step, idx) => {
                    const state = getState(idx);
                    const cfg = stepConfig[state];
                    const isLast = idx === STEPS.length - 1;
                    return (
                        <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
                                     style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                                    {cfg.icon
                                        ? <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                        : <span style={{ color: cfg.color, fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>}
                                </div>
                                <span className="mt-1.5 text-[10px] text-center hidden md:block font-medium" style={{ color: cfg.labelColor }}>{step.label}</span>
                                <span className="mt-1.5 text-[10px] text-center md:hidden font-medium" style={{ color: cfg.labelColor }}>{step.short}</span>
                            </div>
                            {!isLast && (
                                <div className="flex-1 h-px mx-1.5 transition-all"
                                     style={{ background: idx < info.step ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.06)' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="mt-3 text-center">
                <span className="badge" style={{ background: badgeStyle.bg, border: `1px solid ${badgeStyle.border}`, color: badgeStyle.color }}>
                    {status.replace(/_/g, ' ')}
                </span>
            </div>
        </div>
    );
};

export default StatusTracker;
