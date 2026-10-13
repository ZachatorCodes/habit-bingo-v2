import { describe, expect, it } from 'vitest';
import { BACKFILL_DAYS, backfillDates, canLog } from './backfill.ts';

describe('backfillDates', () => {
	it('is today and the 3 days before, newest first', () => {
		expect(BACKFILL_DAYS).toBe(3);
		expect(backfillDates('2026-10-20', '2026-10-01')).toEqual([
			'2026-10-20',
			'2026-10-19',
			'2026-10-18',
			'2026-10-17'
		]);
	});

	it("stays inside the card span and today's month", () => {
		expect(backfillDates('2026-10-20', '2026-10-19')).toEqual(['2026-10-20', '2026-10-19']);
		expect(backfillDates('2026-11-02', '2026-11-01')).toEqual(['2026-11-02', '2026-11-01']);
	});
});

describe('canLog', () => {
	it('allows only dates in the window', () => {
		expect(canLog('2026-10-20', '2026-10-20', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-17', '2026-10-20', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-16', '2026-10-20', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-18', '2026-10-20', '2026-10-19')).toBe(false);
		expect(canLog('2026-10-21', '2026-10-20', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-31', '2026-11-01', '2026-10-01')).toBe(false);
	});
});
