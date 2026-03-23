import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon;
    error?: string;
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, icon: Icon, error, label, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-400">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {Icon && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                            <Icon className="h-4 w-4" />
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn('input', Icon && 'has-icon-left', error && 'input-error', className)}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
    label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, label, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-400">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={inputId}
                    className={cn('input min-h-[100px] resize-y', error && 'input-error', className)}
                    {...props}
                />
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
    label?: string;
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, error, label, id, options, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-400">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={inputId}
                    className={cn('input', error && 'input-error', className)}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} style={{ background: '#111c34' }}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>
        );
    }
);
Select.displayName = 'Select';

export default Input;
