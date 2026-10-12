import { describe, expect, it } from 'vitest';
import { daysInMonth, daysLeftInMonth, lastDayOf, monthName, monthOf, nextMonth } from './calendar';

describe('calendar', () => {
	it.each([
		['2026-10', 31],
		['2026-09', 30],
		['2028-02', 29],
		['2026-02', 28],
		['2100-02', 28],
		['2000-02', 29]
	] as const)('daysInMonth %s = %i', (month, days) => {
		expect(daysInMonth(month)).toBe(days);
	});

	it('lastDayOf and nextMonth roll over the year', () => {
		expect(lastDayOf('2026-12')).toBe('2026-12-31');
		expect(lastDayOf('2028-02')).toBe('2028-02-29');
		expect(nextMonth('2026-12')).toBe('2027-01');
		expect(nextMonth('2026-09')).toBe('2026-10');
	});

	it('daysLeftInMonth counts the start day', () => {
		expect(daysLeftInMonth('2026-10-19')).toBe(13);
		expect(daysLeftInMonth('2026-10-01')).toBe(31);
		expect(daysLeftInMonth('2026-10-31')).toBe(1);
	});

	it('monthOf and monthName', () => {
		expect(monthOf('2026-10-19')).toBe('2026-10');
		expect(monthName('2026-10')).toBe('October');
		expect(monthName('2027-01')).toBe('January');
	});
});
