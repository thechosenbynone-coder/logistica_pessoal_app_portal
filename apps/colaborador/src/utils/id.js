/**
 * ID utilities
 */

/**
 * Generates a unique ID with an optional prefix.
 */
export function uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
