import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning';
    className?: string;
}

const variantStyles = {
    default: 'bg-white border-gray-200',
    primary: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
};

const iconStyles = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-white/20 text-white',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
};

export function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
    className,
}: MetricCardProps) {
    return (
        <div className={cn(
            'relative rounded-xl border p-6 shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden',
            variantStyles[variant],
            className
        )}>
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-current blur-2xl" />
                <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-current blur-xl" />
            </div>

            {/* Left accent bar */}
            <div className={cn(
                'absolute left-0 top-0 bottom-0 w-1',
                variant === 'default' && 'bg-gray-300',
                variant === 'primary' && 'bg-white/40',
                variant === 'success' && 'bg-green-500',
                variant === 'warning' && 'bg-yellow-500'
            )} />

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                    <p className={cn(
                        'text-sm font-medium',
                        variant === 'primary' ? 'text-white/80' : 'text-gray-500'
                    )}>
                        {title}
                    </p>
                    <p className={cn(
                        'text-4xl font-bold mt-2',
                        variant === 'primary' ? 'text-white' : 'text-gray-900'
                    )}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className={cn(
                            'text-sm mt-1',
                            variant === 'primary' ? 'text-white/70' : 'text-gray-500'
                        )}>
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className={cn(
                            'flex items-center gap-1 mt-2 text-sm',
                            trend.isPositive ? 'text-green-600' : 'text-red-600'
                        )}>
                            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
                            <span className="text-gray-400">vs last cycle</span>
                        </div>
                    )}
                </div>
                <div className={cn('p-3 rounded-lg', iconStyles[variant])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}

export default MetricCard;
