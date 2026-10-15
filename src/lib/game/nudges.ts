import { backfillDates } from './backfill.ts';
import { addDays, daysLeftInMonth, weekday } from './calendar.ts';
import { CARD_SIZES, type CardSize } from './card-layout.ts';
import type { CardSpan, Counts } from './evaluate.ts';
import type { HabitRule } from './habit-rules.ts';
import { canBuildNextMonth } from './next-month.ts';
import { completeLines, counts, lineIndexes, reachedTiers } from './score.ts';
import type { SquareState } from './square-state.ts';
import { stateText } from './state-text.ts';

/** A board square for nudges: the center has no id or rule. */
export type NudgeSquare = {
	id: string | null;
	name: string;
	state: SquareState;
	rule: HabitRule | null;
	counts: Counts;
};

export type Nudge = {
	text: string;
	to:
		| { kind: 'sheet'; squareId: string }
		| { kind: 'day'; date: string }
		| { kind: 'card' }
		| { kind: 'next' };
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_NUDGES = 3;

/**
 * Today's "Heads up" (spec §4.8), most urgent first and at most 3: at-risk squares, missed days
 * still in the backfill window, one square from a first bingo, within 2 of a reward tier, and next
 * month's card while the center waits for it.
 */
export function nudges(input: {
	size: CardSize;
	span: CardSpan;
	today: string;
	squares: NudgeSquare[];
	rewards: { sixty: string; blackout: string };
	nextMonthName: string;
}): Nudge[] {
	const { size, span, today, squares, rewards } = input;
	const found: Nudge[] = [];

	// 1. At risk. Missed days of a day habit are the backfill reminder below instead.
	for (const square of squares) {
		if (square.state !== 'atRisk' || !square.id || !square.rule) continue;
		if (square.rule.period === 'day' && square.rule.direction === 'atLeast') continue;
		const why = stateText(square.rule, span, square.counts, today, 'atRisk').replace(
			'At risk: ',
			''
		);
		found.push({ text: `${square.name}: ${why}`, to: { kind: 'sheet', squareId: square.id } });
	}

	// 2. A missed day that can still be logged, newest first.
	for (const square of squares) {
		const habit = square.rule;
		if (!habit || habit.period !== 'day' || habit.direction !== 'atLeast') continue;
		const missed = backfillDates(today, span.startDate).find(
			(date) => date !== today && (square.counts.get(date) ?? 0) < habit.target
		);
		if (!missed) continue;
		const when = missed === addDays(today, -1) ? 'yesterday' : `on ${WEEKDAYS[weekday(missed)]}`;
		found.push({
			text: `You didn't log ${square.name} ${when}: still time`,
			to: { kind: 'day', date: missed }
		});
	}

	const counting = squares.map((square) => counts(square.state));
	const total = counting.filter(Boolean).length;
	const reached = reachedTiers(counting, size);

	// 3. One square from a first bingo.
	const nearLine = lineIndexes(size).some(
		(line) => line.filter((index) => counting[index]).length === size - 1
	);
	if (completeLines(counting, size).length === 0 && nearLine) {
		found.push({ text: '1 square from a bingo', to: { kind: 'card' } });
	}

	// 4. Within 2 squares of a reward tier.
	const tiers = [
		{ tier: 'sixtyPercent', need: CARD_SIZES[size].sixtyThreshold, reward: rewards.sixty },
		{ tier: 'blackout', need: size * size, reward: rewards.blackout }
	] as const;
	for (const { tier, need, reward } of tiers) {
		const left = need - total;
		if (reached.includes(tier) || left > 2) continue;
		found.push({
			text: `${left} square${left === 1 ? '' : 's'} from ${reward}`,
			to: { kind: 'card' }
		});
	}

	// 5. Next month's card, while the center waits for it.
	if (canBuildNextMonth(today) && squares.some((square) => square.state === 'buildNext')) {
		const left = daysLeftInMonth(today);
		found.push({
			text: `Build ${input.nextMonthName}'s card to keep your center square: ${left} day${left === 1 ? '' : 's'} left`,
			to: { kind: 'next' }
		});
	}

	return found.slice(0, MAX_NUDGES);
}
