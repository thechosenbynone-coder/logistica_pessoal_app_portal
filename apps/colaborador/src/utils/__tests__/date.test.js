import { describe, it, expect } from 'vitest';
import { todayISO, formatDateBR, formatTimeBR, minutesBetween, sumPauseMinutes } from '../date';

describe('todayISO', () => {
    it('returns date in YYYY-MM-DD format', () => {
        const result = todayISO();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('formatDateBR', () => {
    it('formats YYYY-MM-DD to DD/MM/YYYY', () => {
        expect(formatDateBR('2026-01-28')).toBe('28/01/2026');
    });

    it('returns empty string for null/undefined', () => {
        expect(formatDateBR(null)).toBe('');
        expect(formatDateBR(undefined)).toBe('');
    });

    it('returns input if invalid format', () => {
        expect(formatDateBR('invalid')).toBe('invalid');
    });
});

describe('formatTimeBR', () => {
    it('formats ISO date to time', () => {
        const result = formatTimeBR('2026-01-28T14:30:00');
        expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns --:-- for null/undefined', () => {
        expect(formatTimeBR(null)).toBe('--:--');
        expect(formatTimeBR(undefined)).toBe('--:--');
    });
});

describe('minutesBetween', () => {
    it('calculates minutes between two dates', () => {
        const start = '2026-01-28T10:00:00';
        const end = '2026-01-28T10:30:00';
        expect(minutesBetween(start, end)).toBe(30);
    });

    it('returns 0 if start is null', () => {
        expect(minutesBetween(null, '2026-01-28T10:00:00')).toBe(0);
    });

    it('returns 0 if end is before start', () => {
        expect(minutesBetween('2026-01-28T10:30:00', '2026-01-28T10:00:00')).toBe(0);
    });
});

describe('sumPauseMinutes', () => {
    it('sums minutes from pause array', () => {
        const pauses = [
            { start: '2026-01-28T10:00:00', end: '2026-01-28T10:15:00' },
            { start: '2026-01-28T11:00:00', end: '2026-01-28T11:10:00' },
        ];
        expect(sumPauseMinutes(pauses)).toBe(25);
    });

    it('returns 0 for empty array', () => {
        expect(sumPauseMinutes([])).toBe(0);
    });
});
