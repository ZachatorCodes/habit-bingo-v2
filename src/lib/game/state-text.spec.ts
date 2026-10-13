import { describe, expect, it } from 'vitest';
import type { CardSpan } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import { stateText } from './state-text.ts';

const span: CardSpan = { startDate: '2026-10-01', weekStartsOn: 'monday' };
const days = (entries: Record<string, number>) => new Map(Object.entries(entries));
const rule = (
	direction: HabitRule['direction'],
	period: HabitRule['period'],
	countMode: HabitRule['countMode'],
	target: number
): HabitRule => ({ direction, period, countMode, target });
const TODAY = '2026-10-24'; // Saturday; its Monday week ends Sunday Oct 25

describe('stateText', () => {
	it('says the plain states in words', () => {
		const read = rule('atLeast', 'month', 'days', 4);
		expect(stateText(read, span, days({}), TODAY, 'empty')).toBe('Not started');
		expect(stateText(read, span, days({}), TODAY, 'inProgress')).toBe('In progress');
		expect(stateText(read, span, days({}), TODAY, 'complete')).toBe('Complete');
		expect(stateText(read, span, days({}), TODAY, 'held')).toBe('Protected');
		expect(stateText(read, span, days({}), TODAY, 'lost')).toBe('Lost');
	});

	it('says how many more a week habit needs and by when', () => {
		const gym = rule('atLeast', 'week', 'days', 3);
		expect(stateText(gym, span, days({ '2026-10-19': 1 }), TODAY, 'atRisk')).toBe(
			'At risk: 2 more by Sunday'
		);
	});

	it('names the earlier week when the shortfall is a past week', () => {
		const gym = rule('atLeast', 'week', 'days', 3);
		// This week is met; last week (ending Sunday Oct 18) is short — today is Tuesday Oct 20.
		expect(
			stateText(
				gym,
				span,
				days({ '2026-10-19': 1, '2026-10-20': 1, '2026-10-12': 1 }),
				'2026-10-20',
				'atRisk'
			)
		).toBe('At risk: last week is still short');
	});

	it('explains at-risk day habits and limits', () => {
		expect(stateText(rule('atLeast', 'day', 'times', 1), span, days({}), TODAY, 'atRisk')).toBe(
			'At risk: log a missed day'
		);
		expect(stateText(rule('atMost', 'month', 'days', 3), span, days({}), TODAY, 'atRisk')).toBe(
			'At risk: at the limit'
		);
	});
});
