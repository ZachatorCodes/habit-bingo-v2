import { describe, expect, it } from 'vitest';
import {
	canBuildNextMonth,
	centerState,
	NEXT_MONTH_WINDOW_DAYS,
	nextMonthOpens
} from './next-month.ts';

describe('nextMonthOpens', () => {
	it('opens the last 7 days of the month', () => {
		expect(NEXT_MONTH_WINDOW_DAYS).toBe(7);
	});

	it.each([
		['2026-10', '2026-10-25'],
		['2026-11', '2026-11-24'],
		['2026-02', '2026-02-22'],
		['2028-02', '2028-02-23']
	])('nextMonthOpens %s = %s', (month, date) => {
		expect(nextMonthOpens(month)).toBe(date);
	});
});

describe('canBuildNextMonth', () => {
	it.each([
		['2026-10-24', false],
		['2026-10-25', true],
		['2026-10-31', true],
		['2026-11-01', false]
	])('%s → %s', (today, open) => {
		expect(canBuildNextMonth(today)).toBe(open);
	});
});

describe('centerState', () => {
	it('is complete before the last 7 days', () => {
		expect(centerState('2026-10', '2026-10-24', false)).toBe('complete');
	});

	it('asks for next month in the last 7 days until it is built', () => {
		expect(centerState('2026-10', '2026-10-25', false)).toBe('buildNext');
		expect(centerState('2026-10', '2026-10-25', true)).toBe('complete');
	});

	it('still asks during the 1st–3rd after the month', () => {
		expect(centerState('2026-10', '2026-11-02', false)).toBe('buildNext');
		expect(centerState('2026-10', '2026-11-02', true)).toBe('complete');
	});

	it('a card started in its last 7 days starts in buildNext', () => {
		expect(centerState('2026-10', '2026-10-27', false)).toBe('buildNext');
	});
});
