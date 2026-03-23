/**
 * Utility function for conditional class names.
 * Similar to clsx/classnames but simpler.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
