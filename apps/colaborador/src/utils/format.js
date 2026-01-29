/**
 * Format utilities
 */

/**
 * Formats a number as Brazilian currency (BRL).
 */
export function formatMoney(n) {
    const v = Number(n || 0);
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Masks CPF for display (shows only last 3 digits).
 * Never log full CPF.
 */
export function maskCPF(cpf) {
    if (!cpf) return '';
    const clean = String(cpf).replace(/\D/g, '');
    if (clean.length < 3) return '***';
    return `***.***.*${clean.slice(-3, -2)}*-${clean.slice(-2)}`;
}

/**
 * Normalizes CPF to digits only.
 */
export function normalizeCPF(cpf) {
    return (cpf || '').toString().replace(/\D/g, '');
}
