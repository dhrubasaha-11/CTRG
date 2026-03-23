import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface CycleProgressProps {
    currentStage: 'stage1' | 'revision' | 'stage2' | 'completed';
    stage1Complete: number;
    stage2Complete: number;
    stage1Date?: string;
    revisionDate?: string;
    stage2Date?: string;
    stats?: {
        stage1Proposals?: number;
        revisionProposals?: number;
        stage2Proposals?: number;
    };
}

export function CycleProgress({ currentStage, stage1Complete, stage2Complete, stage1Date, revisionDate, stage2Date, stats }: CycleProgressProps) {
    const stageOrder = ['stage1', 'revision', 'stage2', 'completed'];
    const currentIdx = stageOrder.indexOf(currentStage);

    const stages = [
        { id: 'stage1',   label: 'Stage 1 Review', date: stage1Date,   count: stats?.stage1Proposals,   complete: stage1Complete },
        { id: 'revision', label: 'Revision Period', date: revisionDate, count: stats?.revisionProposals, complete: currentIdx > 1 ? 100 : 0 },
        { id: 'stage2',   label: 'Stage 2 Review', date: stage2Date,   count: stats?.stage2Proposals,   complete: stage2Complete },
    ];

    const overallPct = Math.round((stage1Complete + stage2Complete) / 2);

    return (
        <div className="card p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-200">Grant Cycle Progress</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Current cycle stage overview</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                     style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <span className="text-xs text-slate-400">Overall:</span>
                    <span className="text-sm font-bold text-brand-300">{overallPct}%</span>
                </div>
            </div>

            <div className="relative">
                {/* Track */}
                <div className="absolute left-5 right-5 top-5 h-px" style={{ background: 'rgba(15,23,42,0.09)' }} />
                {/* Fill */}
                <div className="absolute left-5 top-5 h-px transition-all duration-700"
                     style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />

                <div className="relative grid grid-cols-3 gap-4">
                    {stages.map((stage) => {
                        const stageIdx = stageOrder.indexOf(stage.id);
                        const isDone   = stageIdx < currentIdx;
                        const isActive = stageIdx === currentIdx;

                        return (
                            <div key={stage.id} className="flex flex-col items-center">
                                {/* Icon */}
                                <div className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                                     style={{
                                         background: isDone ? 'rgba(16,185,129,0.12)' : isActive ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.04)',
                                         border: isDone ? '2px solid rgba(16,185,129,0.4)' : isActive ? '2px solid rgba(99,102,241,0.5)' : '2px solid rgba(15,23,42,0.12)',
                                         boxShadow: isActive ? '0 0 14px rgba(99,102,241,0.2)' : 'none',
                                     }}>
                                    {isDone
                                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        : isActive
                                            ? <Clock className="h-5 w-5 text-brand-400 animate-pulse" />
                                            : <Circle className="h-5 w-5 text-slate-600" />}
                                </div>

                                {/* Text */}
                                <div className="mt-3 text-center">
                                    <p className="text-xs font-semibold"
                                       style={{ color: isDone ? '#6ee7b7' : isActive ? '#a5b4fc' : '#64748b' }}>
                                        {stage.label}
                                    </p>
                                    {stage.date && (
                                        <p className="mt-0.5 text-[11px] text-slate-600">{stage.date}</p>
                                    )}
                                    {stage.count !== undefined && (
                                        <span className="mt-1.5 badge" style={{
                                            background: isDone ? 'rgba(16,185,129,0.12)' : isActive ? 'rgba(99,102,241,0.12)' : 'rgba(100,116,139,0.1)',
                                            border: isDone ? '1px solid rgba(16,185,129,0.25)' : isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(100,116,139,0.15)',
                                            color: isDone ? '#6ee7b7' : isActive ? '#a5b4fc' : '#64748b',
                                        }}>
                                            {stage.count} proposals
                                        </span>
                                    )}
                                    {/* Progress bar */}
                                    {stage.complete > 0 && (
                                        <div className="mt-2 w-24 progress-track">
                                            <div className="progress-bar" style={{ width: `${stage.complete}%` }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CycleProgress;
