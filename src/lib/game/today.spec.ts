import { describe, expect, it } from 'vitest';
import type { CardSpan } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import { progressText, todaySection } from './today.ts';

const span: CardSpan = { startDate: '2026-10-01', weekStartsOn: 'monday' };
const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));
const rule = (
	direction: HabitRule['direction'],
	period: HabitRule['period'],
	countMode: HabitRule['countMode'],
	target: number
): HabitRule => ({ direction, period, countMode, target });
const TODAY = '2026-10-20'; // Tuesday; its Monday week is Oct 19–25

describe('todaySection', () => {
	it('limits are slips and earn squares are anytime', () => {
		expect(todaySection(rule('atMost', 'day', 'times', 1), span, counts({}), TODAY)).toBe('slip');
		expect(todaySection(rule('atMost', 'month', 'days', 3), span, counts({}), TODAY)).toBe('slip');
		expect(todaySection(rule('atLeast', 'month', 'days', 4), span, counts({}), TODAY)).toBe(
			'anytime'
		);
	});

	it('day habits are to do until the day is met', () => {
		const water = rule('atLeast', 'day', 'times', 8);
		expect(todaySection(water, span, counts({ [TODAY]: 7 }), TODAY)).toBe('doToday');
		expect(todaySection(water, span, counts({ [TODAY]: 8 }), TODAY)).toBe('done');
		// An earlier day is judged on its own count.
		expect(todaySection(water, span, counts({ [TODAY]: 8 }), '2026-10-19')).toBe('doToday');
	});

	it('week habits are to do until the week is met', () => {
		const gym = rule('atLeast', 'week', 'days', 3);
		const two = counts({ '2026-10-19': 1, '2026-10-20': 1 });
		expect(todaySection(gym, span, two, TODAY)).toBe('doToday');
		expect(
			todaySection(gym, span, counts({ ...Object.fromEntries(two), '2026-10-21': 1 }), '2026-10-21')
		).toBe('done');
	});
});

describe('progressText', () => {
	it('day habits count the day', () => {
		const water = rule('atLeast', 'day', 'times', 8);
		expect(progressText(water, span, counts({ [TODAY]: 5 }), TODAY, TODAY)).toBe('5/8 today');
		expect(progressText(water, span, counts({ '2026-10-18': 3 }), '2026-10-18', TODAY)).toBe(
			'3/8 on Sunday'
		);
	});

	it('week habits count the week, clipped to the card', () => {
		const gym = rule('atLeast', 'week', 'days', 3);
		expect(progressText(gym, span, counts({ '2026-10-19': 1, [TODAY]: 1 }), TODAY, TODAY)).toBe(
			'2 of 3 this week'
		);
		// Oct 1–4 is a 4-day stub week needing 2.
		expect(progressText(gym, span, counts({}), '2026-10-02', '2026-10-02')).toBe(
			'0 of 2 this week'
		);
	});

	it('month habits count the month', () => {
		const read = rule('atLeast', 'month', 'times', 10);
		expect(
			progressText(read, span, counts({ '2026-10-02': 3, '2026-10-12': 1 }), TODAY, TODAY)
		).toBe('4 of 10 this month');
	});

	it('limits read as slips against the limit', () => {
		expect(progressText(rule('atMost', 'day', 'times', 1), span, counts({}), TODAY, TODAY)).toBe(
			'0 of 1 today'
		);
		expect(
			progressText(rule('atMost', 'week', 'times', 2), span, counts({ [TODAY]: 1 }), TODAY, TODAY)
		).toBe('1 of 2 this week');
		expect(
			progressText(
				rule('atMost', 'month', 'days', 3),
				span,
				counts({ '2026-10-02': 2 }),
				TODAY,
				TODAY
			)
		).toBe('1 of 3 this month');
	});
});
