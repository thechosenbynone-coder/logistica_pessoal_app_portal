import { describe, it, expect } from 'vitest';
import { formatMoney, maskCPF, normalizeCPF } from '../format';

describe('formatMoney', () => {
    it('formats number as BRL currency', () => {
        const result = formatMoney(1234.56);
        expect(result).toContain('1.234,56');
    });

    it('handles zero', () => {
        const result = formatMoney(0);
        expect(result).toContain('0,00');
    });

    it('handles null/undefined', () => {
        expect(formatMoney(null)).toContain('0,00');
        expect(formatMoney(undefined)).toContain('0,00');
    });
});

describe('maskCPF', () => {
    it('masks CPF showing only last digits', () => {
        const result = maskCPF('123.456.789-00');
        // Format: ***.***.*X*-YY where X is 3rd from last, YY are last 2
        expect(result).toBe('***.***.*9*-00');
    });

    it('returns *** for empty/short input', () => {
        expect(maskCPF('')).toBe('');
        expect(maskCPF('12')).toBe('***');
    });
});

describe('normalizeCPF', () => {
    it('removes non-digit characters', () => {
        expect(normalizeCPF('123.456.789-00')).toBe('12345678900');
    });

    it('handles empty string', () => {
        expect(normalizeCPF('')).toBe('');
        expect(normalizeCPF(null)).toBe('');
    });
});
