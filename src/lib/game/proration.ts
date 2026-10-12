import { daysInMonth, daysLeftInMonth, monthOf } from './calendar.ts';
import type { HabitRule } from './habit-rules.ts';

/**
 * The target for a card that starts part-way through a month. Only monthly rules shrink: the
 * target is scaled by the days left, rounded half up in integers. "Do it" targets never drop
 * below 1; limits may reach 0.
 */
export function prorateTarget(rule: HabitRule, startDate: string): number {
	if (rule.period !== 'month') return rule.target;
	const total = daysInMonth(monthOf(startDate));
	const left = daysLeftInMonth(startDate);
	const rounded = Math.floor((2 * rule.target * left + total) / (2 * total));
	return rule.direction === 'atLeast' ? Math.max(1, rounded) : rounded;
}
