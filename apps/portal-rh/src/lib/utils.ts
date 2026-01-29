/**
 * Utility function for conditional class names.
 * TypeScript-compatible version.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
