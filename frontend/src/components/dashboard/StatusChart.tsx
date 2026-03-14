/**
 * Status Chart Component
 * Displays proposal status distribution as a donut chart with summary stats.
 */

interface StatusChartProps {
    data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: '#3B82F6',
    UNDER_STAGE_1_REVIEW: '#F59E0B',
    STAGE_1_REJECTED: '#EF4444',
    ACCEPTED_NO_CORRECTIONS: '#22C55E',
    TENTATIVELY_ACCEPTED: '#F97316',
    REVISION_REQUESTED: '#A855F7',
    REVISED_PROPOSAL_SUBMITTED: '#8B5CF6',
    UNDER_STAGE_2_REVIEW: '#06B6D4',
    FINAL_ACCEPTED: '#10B981',
    FINAL_REJECTED: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
    SUBMITTED: 'Submitted',
    UNDER_STAGE_1_REVIEW: 'Stage 1 Review',
    STAGE_1_REJECTED: 'Stage 1 Rejected',
    ACCEPTED_NO_CORRECTIONS: 'Accepted (No Corrections)',
    TENTATIVELY_ACCEPTED: 'Tentatively Accepted',
    REVISION_REQUESTED: 'Revision Requested',
    REVISED_PROPOSAL_SUBMITTED: 'Revised Submitted',
    UNDER_STAGE_2_REVIEW: 'Stage 2 Review',
    FINAL_ACCEPTED: 'Final Accepted',
    FINAL_REJECTED: 'Final Rejected',
};

const CANONICAL_STATUS_ORDER = [
    'SUBMITTED',
    'UNDER_STAGE_1_REVIEW',
    'STAGE_1_REJECTED',
    'ACCEPTED_NO_CORRECTIONS',
    'TENTATIVELY_ACCEPTED',
    'REVISION_REQUESTED',
    'REVISED_PROPOSAL_SUBMITTED',
    'UNDER_STAGE_2_REVIEW',
    'FINAL_ACCEPTED',
    'FINAL_REJECTED',
];

export function StatusChart({ data }: StatusChartProps) {
    const entries = CANONICAL_STATUS_ORDER
        .map((status) => [status, data[status] || 0] as const)
        .filter(([_, value]) => value > 0);
    const total = entries.reduce((sum, [_, value]) => sum + value, 0);

    // Calculate summary stats
    const accepted = (data.FINAL_ACCEPTED || 0) + (data.ACCEPTED_NO_CORRECTIONS || 0);
    const pending =
        (data.SUBMITTED || 0) +
        (data.UNDER_STAGE_1_REVIEW || 0) +
        (data.TENTATIVELY_ACCEPTED || 0) +
        (data.REVISION_REQUESTED || 0) +
        (data.REVISED_PROPOSAL_SUBMITTED || 0) +
        (data.UNDER_STAGE_2_REVIEW || 0);
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                No data available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats Bar */}
            <div className="flex gap-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Total:</span>
                    <span className="text-lg font-bold text-gray-900">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Accepted:</span>
                    <span className="text-lg font-bold text-green-600">{accepted}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Pending:</span>
                    <span className="text-lg font-bold text-yellow-600">{pending}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-gray-500">Rate:</span>
                    <span className="text-lg font-bold text-blue-600">{acceptanceRate}%</span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Donut Chart Visualization */}
                <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {(() => {
                            let cumulative = 0;
                            return entries.map(([status, value]) => {
                                const percentage = (value / total) * 100;
                                const strokeDasharray = `${percentage} ${100 - percentage}`;
                                const strokeDashoffset = -cumulative;
                                cumulative += percentage;

                                return (
                                    <circle
                                        key={status}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke={STATUS_COLORS[status] || '#9CA3AF'}
                                        strokeWidth="12"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-500"
                                    />
                                );
                            });
                        })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{total}</span>
                        <span className="text-sm text-gray-500">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {entries.map(([status, value]) => (
                        <div key={status} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: STATUS_COLORS[status] || '#9CA3AF' }}
                            />
                            <span className="text-gray-600 truncate">
                                {STATUS_LABELS[status] || status}
                            </span>
                            <span className="font-medium text-gray-900 ml-auto">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default StatusChart;
