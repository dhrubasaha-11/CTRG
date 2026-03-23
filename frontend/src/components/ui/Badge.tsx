import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'gray' | 'orange';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    dot?: boolean;
    size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'badge-slate',
    blue:    'badge-brand',
    green:   'badge-green',
    yellow:  'badge-amber',
    red:     'badge-red',
    purple:  'badge-violet',
    cyan:    'badge-cyan',
    gray:    'badge-slate',
    orange:  'badge-orange',
};

const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-slate-500',
    blue:    'bg-brand-500',
    green:   'bg-emerald-500',
    yellow:  'bg-amber-500',
    red:     'bg-red-500',
    purple:  'bg-violet-500',
    cyan:    'bg-cyan-500',
    gray:    'bg-slate-500',
    orange:  'bg-orange-500',
};

export function Badge({ className, variant = 'default', dot = false, size = 'md', children, ...props }: BadgeProps) {
    return (
        <span className={cn('badge', variantClasses[variant], size === 'sm' && 'text-[10px] px-1.5 py-0.5', className)} {...props}>
            {dot && <span className={cn('inline-block w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
            {children}
        </span>
    );
}

export const proposalStatusBadge = (status: string): { variant: BadgeVariant; label: string } => {
    const m: Record<string, { variant: BadgeVariant; label: string }> = {
        DRAFT:                        { variant: 'gray',   label: 'Draft' },
        SUBMITTED:                    { variant: 'blue',   label: 'Submitted' },
        UNDER_STAGE_1_REVIEW:         { variant: 'yellow', label: 'Stage 1 Review' },
        STAGE_1_REJECTED:             { variant: 'red',    label: 'Rejected' },
        ACCEPTED_NO_CORRECTIONS:      { variant: 'green',  label: 'Accepted' },
        TENTATIVELY_ACCEPTED:         { variant: 'yellow', label: 'Tentatively Accepted' },
        REVISION_REQUESTED:           { variant: 'purple', label: 'Revision Requested' },
        REVISED_PROPOSAL_SUBMITTED:   { variant: 'purple', label: 'Revised Submitted' },
        UNDER_STAGE_2_REVIEW:         { variant: 'cyan',   label: 'Stage 2 Review' },
        FINAL_ACCEPTED:               { variant: 'green',  label: 'Final Accepted' },
        FINAL_REJECTED:               { variant: 'red',    label: 'Final Rejected' },
        REVISION_DEADLINE_MISSED:     { variant: 'red',    label: 'Deadline Missed' },
    };
    return m[status] || { variant: 'gray', label: status };
};

export default Badge;
