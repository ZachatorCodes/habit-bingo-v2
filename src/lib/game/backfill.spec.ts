import { describe, expect, it } from 'vitest';
import { BACKFILL_DAYS, backfillDates, backfillMonths, canLog } from './backfill.ts';

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

	it("stays inside the card's span and month", () => {
		expect(backfillDates('2026-10-20', '2026-10-19')).toEqual(['2026-10-20', '2026-10-19']);
		expect(backfillDates('2026-11-02', '2026-11-01')).toEqual(['2026-11-02', '2026-11-01']);
	});

	it("reaches back into last month's card for its last days (spec §3.8)", () => {
		expect(backfillDates('2026-11-01', '2026-10-15')).toEqual([
			'2026-10-31',
			'2026-10-30',
			'2026-10-29'
		]);
		expect(backfillDates('2026-11-03', '2026-10-15')).toEqual(['2026-10-31']);
		expect(backfillDates('2026-11-04', '2026-10-15')).toEqual([]);
	});
});

describe('backfillMonths', () => {
	it('is the months the window touches, newest first', () => {
		expect(backfillMonths('2026-10-20')).toEqual(['2026-10']);
		expect(backfillMonths('2026-11-03')).toEqual(['2026-11', '2026-10']);
		expect(backfillMonths('2026-11-04')).toEqual(['2026-11']);
		expect(backfillMonths('2027-01-01')).toEqual(['2027-01', '2026-12']);
	});
});

describe('canLog', () => {
	it('allows only dates in the window', () => {
		expect(canLog('2026-10-20', '2026-10-20', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-17', '2026-10-20', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-16', '2026-10-20', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-18', '2026-10-20', '2026-10-19')).toBe(false);
		expect(canLog('2026-10-21', '2026-10-20', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-31', '2026-11-01', '2026-10-01')).toBe(true);
		expect(canLog('2026-11-01', '2026-11-01', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-31', '2026-11-04', '2026-10-01')).toBe(false);
	});
});
