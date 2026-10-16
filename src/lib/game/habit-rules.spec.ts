import { describe, expect, it } from 'vitest';
import {
	defaultCountMode,
	describeRule,
	normalizeRule,
	targetRange,
	type CountMode,
	type Direction,
	type HabitRule,
	type Period
} from './habit-rules';

describe('targetRange', () => {
	it.each([
		['atLeast', 'day', 'times', { min: 1, max: 20 }],
		['atLeast', 'week', 'days', { min: 1, max: 7 }],
		['atLeast', 'week', 'times', { min: 1, max: 50 }],
		['atLeast', 'month', 'days', { min: 1, max: 31 }],
		['atLeast', 'month', 'times', { min: 1, max: 100 }],
		['atMost', 'day', 'times', { min: 1, max: 19 }],
		['atMost', 'week', 'days', { min: 0, max: 6 }],
		['atMost', 'week', 'times', { min: 0, max: 50 }],
		['atMost', 'month', 'days', { min: 0, max: 30 }],
		['atMost', 'month', 'times', { min: 0, max: 100 }]
	] as const)('range for %s/%s/%s', (direction, period, countMode, range) => {
		expect(targetRange(direction as Direction, period as Period, countMode as CountMode)).toEqual(
			range
		);
	});

	it('per-day habits have the same range whichever count mode is asked for', () => {
		expect(targetRange('atLeast', 'day', 'days')).toEqual({ min: 1, max: 20 });
	});

	// Check-ins cap at 20 a day, so a limit of 20 could never be broken; 0 a day is "None this month".
	it('per-day limits allow 1 to 19 whichever count mode is asked for', () => {
		expect(targetRange('atMost', 'day', 'days')).toEqual({ min: 1, max: 19 });
	});
});

describe('defaultCountMode', () => {
	it('defaults: atMost → times, atLeast → days', () => {
		expect(defaultCountMode('atMost')).toBe('times');
		expect(defaultCountMode('atLeast')).toBe('days');
	});
});

describe('normalizeRule', () => {
	it('accepts a valid rule and parses a string target', () => {
		expect(
			normalizeRule({ direction: 'atLeast', period: 'month', countMode: 'times', target: '3' })
		).toEqual({
			ok: true,
			rule: { direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }
		});
	});

	it('per-day habits always count times, whatever was posted', () => {
		const result = normalizeRule({
			direction: 'atLeast',
			period: 'day',
			countMode: 'days',
			target: 8
		});
		expect(result).toEqual({
			ok: true,
			rule: { direction: 'atLeast', period: 'day', countMode: 'times', target: 8 }
		});
	});

	it('uses the default count mode when it is missing or invalid', () => {
		expect(normalizeRule({ direction: 'atMost', period: 'month', target: 10 })).toMatchObject({
			ok: true,
			rule: { countMode: 'times' }
		});
		expect(
			normalizeRule({ direction: 'atLeast', period: 'week', countMode: 'often', target: 2 })
		).toMatchObject({ ok: true, rule: { countMode: 'days' } });
	});

	it('accepts a limit per day, counted in times', () => {
		expect(
			normalizeRule({ direction: 'atMost', period: 'day', countMode: 'days', target: '1' })
		).toEqual({
			ok: true,
			rule: { direction: 'atMost', period: 'day', countMode: 'times', target: 1 }
		});
	});

	it('rejects a per-day limit of 0 or 20', () => {
		for (const target of [0, 20]) {
			expect(normalizeRule({ direction: 'atMost', period: 'day', target })).toEqual({
				ok: false,
				field: 'target',
				message: 'Pick a number from 1 to 19.'
			});
		}
	});

	it('rejects out-of-range and non-integer targets with the range in the message', () => {
		const base = { direction: 'atLeast', period: 'month', countMode: 'days' };
		expect(normalizeRule({ ...base, target: '8' })).toMatchObject({ ok: true });
		for (const target of ['0', '32', '2.5', 'abc', '', ' ', 2.5, Number.NaN]) {
			expect(normalizeRule({ ...base, target })).toEqual({
				ok: false,
				field: 'target',
				message: 'Pick a number from 1 to 31.'
			});
		}
	});

	it('allows zero for limits', () => {
		expect(
			normalizeRule({ direction: 'atMost', period: 'month', countMode: 'days', target: '0' })
		).toMatchObject({ ok: true, rule: { target: 0 } });
	});

	it('rejects unknown directions and periods', () => {
		expect(normalizeRule({ direction: 'sometimes', period: 'week', target: 1 })).toEqual({
			ok: false,
			field: 'direction',
			message: 'Pick Do it or Limit it.'
		});
		expect(normalizeRule({ direction: 'atLeast', period: 'year', target: 1 })).toEqual({
			ok: false,
			field: 'period',
			message: 'Pick a day, a week or a month.'
		});
	});
});

describe('describeRule', () => {
	it.each([
		[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }, 'Once a month'],
		[{ direction: 'atLeast', period: 'week', countMode: 'days', target: 1 }, 'Once a week'],
		[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 12 }, '12 days a month'],
		[{ direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }, '3 times a month'],
		[{ direction: 'atLeast', period: 'week', countMode: 'days', target: 2 }, '2 days a week'],
		[{ direction: 'atLeast', period: 'week', countMode: 'times', target: 1 }, 'Once a week'],
		[{ direction: 'atLeast', period: 'day', countMode: 'times', target: 1 }, 'Every day'],
		[{ direction: 'atLeast', period: 'day', countMode: 'times', target: 8 }, '8 times a day'],
		[
			{ direction: 'atMost', period: 'month', countMode: 'times', target: 10 },
			'At most 10 times a month'
		],
		[
			{ direction: 'atMost', period: 'month', countMode: 'days', target: 3 },
			'At most 3 days a month'
		],
		[{ direction: 'atMost', period: 'week', countMode: 'times', target: 1 }, 'At most once a week'],
		[{ direction: 'atMost', period: 'day', countMode: 'times', target: 1 }, 'At most once a day'],
		[
			{ direction: 'atMost', period: 'day', countMode: 'times', target: 3 },
			'At most 3 times a day'
		],
		[{ direction: 'atMost', period: 'month', countMode: 'times', target: 0 }, 'None this month'],
		[{ direction: 'atMost', period: 'week', countMode: 'days', target: 0 }, 'None this week']
	] as const)('describes %o as %s', (rule, sentence) => {
		expect(describeRule(rule as HabitRule)).toBe(sentence);
	});
});
