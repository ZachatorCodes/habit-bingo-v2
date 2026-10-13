import { describe, expect, it } from 'vitest';
import type { HabitRule } from './habit-rules.ts';
import { clippedWeeks, weekOf } from './weeks.ts';

const rule = (
	direction: HabitRule['direction'],
	countMode: HabitRule['countMode'],
	target: number
): HabitRule => ({ direction, period: 'week', countMode, target });

// October 2026 starts on a Thursday. Monday weeks: Oct 1–4 (4 days), 5–11, 12–18, 19–25, 26–31 (6).
describe('clippedWeeks', () => {
	it('clips Monday weeks to the month and prorates atLeast round-half-up', () => {
		const weeks = clippedWeeks(rule('atLeast', 'days', 3), '2026-10-01', 'monday');
		expect(weeks.map((w) => [w.start, w.end, w.days])).toEqual([
			['2026-10-01', '2026-10-04', 4],
			['2026-10-05', '2026-10-11', 7],
			['2026-10-12', '2026-10-18', 7],
			['2026-10-19', '2026-10-25', 7],
			['2026-10-26', '2026-10-31', 6]
		]);
		// 3 × 4 / 7 = 1.71 → 2; 3 × 6 / 7 = 2.57 → 3.
		expect(weeks.map((w) => w.required)).toEqual([2, 3, 3, 3, 3]);
	});

	it('rounds exactly half up', () => {
		// N = 1 over 4 days: 4 / 7 = 0.57 → 1.
		const weeks = clippedWeeks(rule('atLeast', 'times', 1), '2026-10-01', 'monday');
		expect(weeks[0].required).toBe(1);
		// N = 7, days = 4: 28 / 7 = 4 exactly.
		expect(clippedWeeks(rule('atLeast', 'times', 7), '2026-10-01', 'monday')[0].required).toBe(4);
		// N = 1, days = 3 (Sunday weeks, Oct 1–3): 3 / 7 = 0.43 → 0.
		expect(clippedWeeks(rule('atLeast', 'times', 1), '2026-10-01', 'sunday')[0].required).toBe(0);
	});

	it('caps days mode at the days in the week', () => {
		expect(clippedWeeks(rule('atLeast', 'days', 7), '2026-10-31', 'monday')).toEqual([
			{ start: '2026-10-31', end: '2026-10-31', days: 1, required: 1 }
		]);
		expect(clippedWeeks(rule('atMost', 'days', 6), '2026-10-01', 'monday')[0].required).toBe(4);
	});

	it('limits round up for atMost', () => {
		// ceil(2 × 4 / 7) = ceil(1.14) = 2; ceil(2 × 1 / 7) = 1.
		expect(clippedWeeks(rule('atMost', 'times', 2), '2026-10-01', 'monday')[0].required).toBe(2);
		expect(clippedWeeks(rule('atMost', 'times', 2), '2026-10-31', 'monday')[0].required).toBe(1);
		expect(clippedWeeks(rule('atMost', 'times', 0), '2026-10-31', 'monday')[0].required).toBe(0);
	});

	it('Sunday weeks', () => {
		const weeks = clippedWeeks(rule('atLeast', 'days', 3), '2026-10-01', 'sunday');
		expect([weeks[0].start, weeks[0].end, weeks[0].days]).toEqual(['2026-10-01', '2026-10-03', 3]);
		expect([weeks[1].start, weeks[1].end]).toEqual(['2026-10-04', '2026-10-10']);
		expect(weeks.at(-1)).toMatchObject({ start: '2026-10-25', end: '2026-10-31', days: 7 });
	});

	it('a card started on a Sunday with Monday weeks', () => {
		const weeks = clippedWeeks(rule('atLeast', 'days', 3), '2026-10-18', 'monday');
		expect(weeks[0]).toEqual({ start: '2026-10-18', end: '2026-10-18', days: 1, required: 0 });
		expect(weeks[1]).toMatchObject({
			start: '2026-10-19',
			end: '2026-10-25',
			days: 7,
			required: 3
		});
	});
});

describe('weekOf', () => {
	it('finds the week holding a date', () => {
		const weeks = clippedWeeks(rule('atLeast', 'days', 3), '2026-10-01', 'monday');
		expect(weekOf(weeks, '2026-10-04')?.start).toBe('2026-10-01');
		expect(weekOf(weeks, '2026-10-26')?.end).toBe('2026-10-31');
		expect(weekOf(weeks, '2026-11-01')).toBeNull();
	});
});
