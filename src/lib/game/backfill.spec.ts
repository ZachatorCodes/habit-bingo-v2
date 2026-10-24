import { describe, expect, it } from 'vitest';
import {
	BACKFILL_DAYS,
	backfillDates,
	backfillMonths,
	canLog,
	loggableDates,
	settledBefore
} from './backfill.ts';

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

describe('loggableDates', () => {
	it('is every day of the card so far, newest first', () => {
		expect(loggableDates('2026-10-24', '2026-10-01')).toHaveLength(24);
		const late = loggableDates('2026-10-24', '2026-10-20');
		expect(late).toEqual(['2026-10-24', '2026-10-23', '2026-10-22', '2026-10-21', '2026-10-20']);
	});
});

describe('canLog', () => {
	it('allows any day of the open month from the start date to today', () => {
		expect(canLog('2026-10-24', '2026-10-24', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-12', '2026-10-24', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-19', '2026-10-24', '2026-10-20')).toBe(false);
		expect(canLog('2026-10-25', '2026-10-24', '2026-10-01')).toBe(false);
	});

	it('keeps last month open on the 1st-3rd, then locks it', () => {
		expect(canLog('2026-10-31', '2026-11-01', '2026-10-01')).toBe(true);
		expect(canLog('2026-10-31', '2026-11-02', '2026-10-01')).toBe(true);
		expect(canLog('2026-11-01', '2026-11-01', '2026-10-01')).toBe(false);
		expect(canLog('2026-10-31', '2026-11-04', '2026-10-01')).toBe(false);
	});
});

describe('settledBefore', () => {
	it('is the first day that can still change', () => {
		expect(settledBefore('2026-10-24', '2026-10')).toBe('2026-10-01');
		expect(settledBefore('2026-11-04', '2026-10')).toBe('2026-11-01');
	});
});
