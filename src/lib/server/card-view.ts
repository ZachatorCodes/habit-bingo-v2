import { monthName, nextMonth } from '#lib/game/calendar.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import { centerState, nextMonthOpens } from '#lib/game/next-month.ts';
import { scoreCard, squarePoints, type CardScore } from '#lib/game/score.ts';
import type { SquareState } from '#lib/game/square-state.ts';
import { getCard, type Card } from '#lib/server/cards.ts';
import { getCheckIns } from '#lib/server/check-ins.ts';
import type { Db } from '#lib/server/db/client.ts';

export type ViewSquare = {
	/** Habit squares only: links to the habit sheet. */
	id?: string;
	emoji: string;
	name: string;
	state: SquareState;
	progress?: number;
	/** The center square, which leads to next month's card. */
	link?: boolean;
	points: number;
};

/**
 * A card as of `today`: every square's live state and points (the center by spec §3.5) and the
 * card's score (§3.6–§3.7). Shared by the card and Today, which passes the check-ins it already has.
 */
export async function cardView(
	db: Db,
	userId: string,
	card: Card,
	today: string,
	known?: Awaited<ReturnType<typeof getCheckIns>>
): Promise<{ squares: ViewSquare[]; score: CardScore; nextMonthName: string }> {
	const next = monthName(nextMonth(card.month));
	const [nextCard, checkIns] = await Promise.all([
		getCard(db, userId, nextMonth(card.month)),
		known ?? getCheckIns(db, card.id)
	]);
	// The center square: free until the last 7 days, then it leads to next month's card.
	// Only a next card built by the 3rd completes the center (spec §3.5): one built later starts later.
	const builtInTime = nextCard !== null && nextCard.startDate <= `${nextMonth(card.month)}-03`;
	const state = centerState(card.month, today, builtInTime);
	const center: ViewSquare =
		today < nextMonthOpens(card.month)
			? { emoji: '⭐', name: 'Free', state, points: 0 }
			: state === 'buildNext'
				? { emoji: '🗓️', name: `Build ${next}'s card`, state, link: true, points: 0 }
				: { emoji: '🗓️', name: `${next} ready`, state, link: true, points: 0 };
	const squares = card.squares.map((square): ViewSquare => {
		if (square.isCenter) return center;
		const counts = checkIns.get(square.id) ?? new Map<string, number>();
		const evaluation = evaluateSquare(square, card, counts, today);
		return {
			id: square.id,
			emoji: square.emoji,
			name: square.name,
			...evaluation,
			points: squarePoints(square, card, counts, today, evaluation.state)
		};
	});
	return { squares, score: scoreCard(card.size, squares), nextMonthName: next };
}
