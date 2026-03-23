import { FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
    id: number;
    type: 'submission' | 'review' | 'decision' | 'revision';
    description: string;
    timestamp: string;
    user?: string;
}

interface ActivityTimelineProps {
    activities: Activity[];
}

const typeConfig = {
    submission: { icon: FileText,     color: '#818cf8', bg: 'rgba(99,102,241,0.15)',   border: 'rgba(99,102,241,0.25)' },
    review:     { icon: CheckCircle,  color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.25)' },
    decision:   { icon: AlertCircle,  color: '#c4b5fd', bg: 'rgba(139,92,246,0.15)',   border: 'rgba(139,92,246,0.25)' },
    revision:   { icon: RefreshCw,    color: '#fdba74', bg: 'rgba(249,115,22,0.15)',   border: 'rgba(249,115,22,0.25)' },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    if (!activities || activities.length === 0) {
        return <p className="text-xs text-slate-600 py-2">No recent activity.</p>;
    }

    return (
        <div className="space-y-3">
            {activities.map((activity, idx) => {
                const cfg     = typeConfig[activity.type] ?? typeConfig.submission;
                const Icon    = cfg.icon;
                const isLast  = idx === activities.length - 1;

                return (
                    <div key={activity.id} className="relative flex gap-3">
                        {!isLast && (
                            <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '0', width: '1px', background: 'rgba(15,23,42,0.09)' }} />
                        )}

                        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl"
                             style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <Icon style={{ color: cfg.color }} className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 pb-3">
                            <p className="text-xs font-medium text-slate-300 leading-snug">{activity.description}</p>
                            {activity.user && (
                                <p className="text-xs text-slate-600 mt-0.5">by {activity.user}</p>
                            )}
                            <p className="text-[11px] text-slate-700 mt-0.5">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ActivityTimeline;
