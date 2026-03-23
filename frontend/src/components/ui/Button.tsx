/**
 * Button Component
 * Reusable button with multiple variants, sizes, and states.
 */
import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
}

const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
};

const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            icon: Icon,
            iconPosition = 'left',
            loading = false,
            fullWidth = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'btn',
                    variantClasses[variant],
                    sizeClasses[size],
                    fullWidth && 'w-full',
                    className
                )}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <>
                        <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        <span>Loading...</span>
                    </>
                ) : (
                    <>
                        {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
                        {children}
                        {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
