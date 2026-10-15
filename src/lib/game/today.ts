import { addDays, lastDayOf, monthOf, weekday } from './calendar.ts';
import { progressBetween, type CardSpan, type Counts } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import { clippedWeeks, weekOf } from './weeks.ts';

/** Where a habit appears on Today (spec §4.5). */
export type TodaySection = 'doToday' | 'thisWeek' | 'done' | 'anytime' | 'slip';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Limits are slips, earn squares are "anytime this month", day habits are "do today" and week
 * habits "this week" until `day` (or its week) is met, then "done".
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
	return progress >= required ? 'done' : 'thisWeek';
}

/** The row's progress, e.g. "5/8 today", "1 more · 6 days left", "1 of 3 this month" (a limit). */
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
		const { required, progress, end } = weekProgress(rule, span, counts, day);
		if (rule.direction === 'atMost' || progress >= required)
			return `${progress} of ${required} this week`;
		return `${required - progress} more · ${left(today, end, 'last week')}`;
	}
	// Check-ins only exist inside the card's month, up to today.
	const progress = progressBetween(rule, counts, span.startDate, today);
	if (rule.direction === 'atMost' || progress >= rule.target)
		return `${progress} of ${rule.target} this month`;
	return `${rule.target - progress} more · ${left(today, lastDayOf(monthOf(span.startDate)), 'last month')}`;
}

/**
 * "6 days left" until `end`, counting today; once it has passed, `past` ("last week"), or "last
 * month" for last month's card on the 1st–3rd.
 */
function left(today: string, end: string, past: string): string {
	if (end < today) return monthOf(end) < monthOf(today) ? 'last month' : past;
	let days = 0;
	for (let d = today; d <= end; d = addDays(d, 1)) days++;
	return days === 1 ? '1 day left' : `${days} days left`;
}

/** The clipped week holding `day`, with progress over it (dates up to `day`'s week end). */
function weekProgress(rule: HabitRule, span: CardSpan, counts: Counts, day: string) {
	const week = weekOf(clippedWeeks(rule, span.startDate, span.weekStartsOn), day);
	// `day` is always inside the card's span, so it has a week.
	const { start, end, required } = week!;
	return { required, end, progress: progressBetween(rule, counts, start, end) };
}
