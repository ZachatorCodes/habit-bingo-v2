import { addDays, lastDayOf, monthOf, weekday } from './calendar.ts';
import type { HabitRule } from './habit-rules.ts';

/** A calendar week clipped to the card's span, with what it requires (or allows) (spec §3.4). */
export type Week = { start: string; end: string; days: number; required: number };

/**
 * The weeks from `startDate` to the end of its month, each clipped to that span. `atLeast` needs
 * round(N × d / 7), rounded half up; `atMost` allows ceil(N × d / 7) so a stub week is never
 * stricter than a full one; in `days` mode both are capped at the week's d days.
 */
export function clippedWeeks(
	rule: HabitRule,
	startDate: string,
	weekStartsOn: 'monday' | 'sunday'
): Week[] {
	const first = weekStartsOn === 'monday' ? 1 : 0;
	const last = lastDayOf(monthOf(startDate));
	const weeks: Week[] = [];
	for (let start = startDate; start <= last;) {
		const toWeekEnd = (first + 6 - weekday(start)) % 7;
		const naturalEnd = addDays(start, toWeekEnd);
		const end = naturalEnd < last ? naturalEnd : last;
		const days = daysFrom(start, end);
		weeks.push({ start, end, days, required: weekRequirement(rule, days) });
		start = addDays(end, 1);
	}
	return weeks;
}

/** Days from `start` to `end`, both included. */
function daysFrom(start: string, end: string): number {
	let days = 1;
	for (let d = start; d < end; d = addDays(d, 1)) days++;
	return days;
}

function weekRequirement(rule: HabitRule, days: number): number {
	const scaled =
		rule.direction === 'atLeast'
			? Math.floor((2 * rule.target * days + 7) / 14)
			: Math.floor((rule.target * days + 6) / 7);
	return rule.countMode === 'days' ? Math.min(scaled, days) : scaled;
}

/** The week holding `date`, or null outside the span. */
export function weekOf(weeks: Week[], date: string): Week | null {
	return weeks.find((week) => week.start <= date && date <= week.end) ?? null;
}
