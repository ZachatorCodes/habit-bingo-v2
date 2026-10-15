import { backfillMonths } from './backfill.ts';
import { monthOf } from './calendar.ts';
import { CATEGORIES, type CategoryId } from './categories.ts';
import { counts } from './score.ts';
import type { SquareState } from './square-state.ts';

/** Whether a month is final: past, and out of today's backfill window (spec §3.8). */
export function isFinal(month: string, today: string): boolean {
	return month < monthOf(today) && !backfillMonths(today).includes(month);
}

/** The recap's highlight (spec §4.11): the most check-ins in total; a tie goes to the earlier square. */
export function mostLogged(
	squares: { id: string; emoji: string; name: string }[],
	checkIns: ReadonlyMap<string, ReadonlyMap<string, number>>
): { emoji: string; name: string; total: number } | null {
	let best: { emoji: string; name: string; total: number } | null = null;
	for (const { id, emoji, name } of squares) {
		let total = 0;
		for (const count of checkIns.get(id)?.values() ?? []) total += count;
		if (total > (best?.total ?? 0)) best = { emoji, name, total };
	}
	return best;
}

/** Per category, in display order, how many of its squares counted (spec §4.11). */
export function categoryBreakdown(
	squares: { category: CategoryId; state: SquareState }[]
): { id: CategoryId; emoji: string; label: string; counting: number; total: number }[] {
	return CATEGORIES.map(({ id, emoji, label }) => {
		const mine = squares.filter((square) => square.category === id);
		return {
			id,
			emoji,
			label,
			counting: mine.filter((s) => counts(s.state)).length,
			total: mine.length
		};
	}).filter((row) => row.total > 0);
}
