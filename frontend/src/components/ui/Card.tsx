import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'gradient';
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
    default: 'card',
    glass: 'glass rounded-2xl',
    gradient: 'card rounded-2xl',
};

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-7',
};

export function Card({ className, variant = 'default', hover = true, padding = 'none', children, ...props }: CardProps) {
    return (
        <div className={cn(variantClasses[variant], paddingClasses[padding], !hover && 'hover:shadow-none', className)} {...props}>
            {children}
        </div>
    );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function CardHeader({ className, title, subtitle, action, children, ...props }: CardHeaderProps) {
    return (
        <div className={cn('px-5 py-4', className)} style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }} {...props}>
            {(title || subtitle || action) ? (
                <div className="flex items-center justify-between gap-3">
                    <div>
                        {title    && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            ) : children}
        </div>
    );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('p-5', className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('px-5 py-4', className)} style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }} {...props}>
            {children}
        </div>
    );
}

export default Card;
