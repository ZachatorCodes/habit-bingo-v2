import { addDays, weekday } from './calendar.ts';
import { progressBetween, type CardSpan, type Counts } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import type { SquareState } from './square-state.ts';
import { clippedWeeks, weekOf } from './weeks.ts';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PLAIN: Record<Exclude<SquareState, 'atRisk'>, string> = {
	empty: 'Not started',
	inProgress: 'In progress',
	complete: 'Complete',
	held: 'Protected',
	lost: 'Lost',
	free: 'Free',
	buildNext: "Build next month's card"
};

/** The square's state in words for the habit sheet (spec §4.6), e.g. "At risk: 1 more by Sunday". */
export function stateText(
	rule: HabitRule,
	span: CardSpan,
	counts: Counts,
	today: string,
	state: SquareState
): string {
	if (state !== 'atRisk') return PLAIN[state];
	if (rule.direction === 'atMost') return 'At risk: at the limit';
	if (rule.period === 'day') return 'At risk: log a missed day';
	// A week habit: either this week runs out of days, or a past week is still short.
	const week = weekOf(clippedWeeks(rule, span.startDate, span.weekStartsOn), today)!;
	const short = week.required - progressBetween(rule, counts, week.start, week.end);
	let daysLeft = 0;
	for (let d = today; d <= week.end; d = addDays(d, 1)) daysLeft++;
	if (short > 0 && daysLeft <= short) {
		return `At risk: ${short} more by ${WEEKDAYS[weekday(week.end)]}`;
	}
	return 'At risk: last week is still short';
}
