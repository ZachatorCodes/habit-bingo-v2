import { weekday } from './calendar.ts';
import { progressBetween, type CardSpan, type Counts } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import { clippedWeeks, weekOf } from './weeks.ts';

/** Where a habit appears on Today (spec §4.5). */
export type TodaySection = 'doToday' | 'done' | 'anytime' | 'slip';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Limits are slips, earn squares are "anytime this month", and day and week habits are "do today"
 * until `day` (or its week) is met, then "done".
 */
export function todaySection(
	rule: HabitRule,
	span: CardSpan,
	counts: Counts,
	day: string
): TodaySection {
	if (rule.direction === 'atMost') return 'slip';
	if (rule.period === 'month') return 'anytime';
	if (rule.period === 'day') return (counts.get(day) ?? 0) >= rule.target ? 'done' : 'doToday';
	const { required, progress } = weekProgress(rule, span, counts, day);
	return progress >= required ? 'done' : 'doToday';
}

/** The row's progress, e.g. "5/8 today", "2 of 3 this week", "1 of 3 this month". */
export function progressText(
	rule: HabitRule,
	span: CardSpan,
	counts: Counts,
	day: string,
	today: string
): string {
	if (rule.period === 'day') {
		const count = counts.get(day) ?? 0;
		const when = day === today ? 'today' : `on ${WEEKDAYS[weekday(day)]}`;
		return rule.direction === 'atLeast'
			? `${count}/${rule.target} ${when}`
			: `${count} of ${rule.target} ${when}`;
	}
	if (rule.period === 'week') {
		const { required, progress } = weekProgress(rule, span, counts, day);
		return `${progress} of ${required} this week`;
	}
	// Check-ins only exist inside the card's month, up to today.
	return `${progressBetween(rule, counts, span.startDate, today)} of ${rule.target} this month`;
}

/** The clipped week holding `day`, with progress over it (dates up to `day`'s week end). */
function weekProgress(rule: HabitRule, span: CardSpan, counts: Counts, day: string) {
	const week = weekOf(clippedWeeks(rule, span.startDate, span.weekStartsOn), day);
	// `day` is always inside the card's span, so it has a week.
	const { start, end, required } = week!;
	return { required, progress: progressBetween(rule, counts, start, end) };
}
