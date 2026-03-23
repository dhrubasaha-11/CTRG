interface StatusChartProps {
    data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED:                    '#6366f1',
    UNDER_STAGE_1_REVIEW:         '#f59e0b',
    STAGE_1_REJECTED:             '#ef4444',
    ACCEPTED_NO_CORRECTIONS:      '#10b981',
    TENTATIVELY_ACCEPTED:         '#f97316',
    REVISION_REQUESTED:           '#a855f7',
    REVISED_PROPOSAL_SUBMITTED:   '#8b5cf6',
    UNDER_STAGE_2_REVIEW:         '#06b6d4',
    FINAL_ACCEPTED:               '#10b981',
    FINAL_REJECTED:               '#dc2626',
};

const STATUS_LABELS: Record<string, string> = {
    SUBMITTED:                    'Submitted',
    UNDER_STAGE_1_REVIEW:         'Stage 1 Review',
    STAGE_1_REJECTED:             'S1 Rejected',
    ACCEPTED_NO_CORRECTIONS:      'Accepted',
    TENTATIVELY_ACCEPTED:         'Tentative',
    REVISION_REQUESTED:           'Revision',
    REVISED_PROPOSAL_SUBMITTED:   'Revised',
    UNDER_STAGE_2_REVIEW:         'Stage 2 Review',
    FINAL_ACCEPTED:               'Final Accepted',
    FINAL_REJECTED:               'Final Rejected',
};

const ORDER = [
    'SUBMITTED', 'UNDER_STAGE_1_REVIEW', 'STAGE_1_REJECTED', 'ACCEPTED_NO_CORRECTIONS',
    'TENTATIVELY_ACCEPTED', 'REVISION_REQUESTED', 'REVISED_PROPOSAL_SUBMITTED',
    'UNDER_STAGE_2_REVIEW', 'FINAL_ACCEPTED', 'FINAL_REJECTED',
];

export function StatusChart({ data }: StatusChartProps) {
    const entries = ORDER.map((s) => [s, data[s] || 0] as const).filter(([, v]) => v > 0);
    const total   = entries.reduce((s, [, v]) => s + v, 0);

    const accepted        = (data.FINAL_ACCEPTED || 0) + (data.ACCEPTED_NO_CORRECTIONS || 0);
    const pending         = (data.SUBMITTED || 0) + (data.UNDER_STAGE_1_REVIEW || 0) + (data.TENTATIVELY_ACCEPTED || 0) + (data.REVISION_REQUESTED || 0) + (data.REVISED_PROPOSAL_SUBMITTED || 0) + (data.UNDER_STAGE_2_REVIEW || 0);
    const acceptanceRate  = total > 0 ? Math.round((accepted / total) * 100) : 0;

    if (total === 0) {
        return (
            <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-slate-600">No proposals yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total',    value: total,           color: '#818cf8' },
                    { label: 'Accepted', value: accepted,         color: '#6ee7b7' },
                    { label: 'Pending',  value: pending,          color: '#fcd34d' },
                    { label: 'Rate',     value: `${acceptanceRate}%`, color: '#67e8f9' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                        <p className="text-xl font-bold" style={{ color }}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="flex flex-col items-center gap-6 sm:flex-row">
                {/* Donut */}
                <div className="relative w-44 h-44 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {(() => {
                            let cumulative = 0;
                            return entries.map(([status, value]) => {
                                const pct = (value / total) * 100;
                                const offset = -cumulative;
                                cumulative += pct;
                                return (
                                    <circle
                                        key={status}
                                        cx="50" cy="50" r="38"
                                        fill="none"
                                        stroke={STATUS_COLORS[status] || '#64748b'}
                                        strokeWidth="10"
                                        strokeDasharray={`${pct} ${100 - pct}`}
                                        strokeDashoffset={offset}
                                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                    />
                                );
                            });
                        })()}
                        <circle cx="50" cy="50" r="28" fill="#0d1529" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.04em' }}>{total}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-1 gap-1.5 w-full sm:grid-cols-2">
                    {entries.map(([status, value]) => (
                        <div key={status} className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                             style={{ background: 'rgba(255,255,255,0.025)' }}>
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                 style={{ backgroundColor: STATUS_COLORS[status] || '#64748b', boxShadow: `0 0 6px ${STATUS_COLORS[status]}55` }} />
                            <span className="text-xs text-slate-400 truncate flex-1">{STATUS_LABELS[status] || status}</span>
                            <span className="text-xs font-bold text-slate-200 ml-auto">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default StatusChart;
