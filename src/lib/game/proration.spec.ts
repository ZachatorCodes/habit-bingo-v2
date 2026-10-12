import { describe, expect, it } from 'vitest';
import type { HabitRule } from './habit-rules';
import { prorateTarget } from './proration';

describe('prorateTarget', () => {
	it.each([
		[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 10 }, '2026-10-19', 4],
		[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }, '2026-10-31', 1],
		[{ direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }, '2028-02-15', 2],
		[{ direction: 'atMost', period: 'month', countMode: 'times', target: 3 }, '2026-10-19', 1],
		[{ direction: 'atMost', period: 'month', countMode: 'times', target: 1 }, '2026-09-16', 1],
		[{ direction: 'atMost', period: 'month', countMode: 'days', target: 0 }, '2026-10-19', 0],
		[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 10 }, '2026-10-01', 10],
		[{ direction: 'atLeast', period: 'week', countMode: 'days', target: 3 }, '2026-10-19', 3],
		[{ direction: 'atMost', period: 'day', countMode: 'times', target: 1 }, '2026-10-31', 1]
	] as [HabitRule, string, number][])('prorates %o from %s to %i', (rule, start, expected) => {
		expect(prorateTarget(rule, start)).toBe(expected);
	});
});
