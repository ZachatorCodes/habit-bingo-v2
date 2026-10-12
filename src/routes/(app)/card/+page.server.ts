import { error } from '@sveltejs/kit';
import { monthName } from '#lib/game/calendar.ts';
import { initialSquareState } from '#lib/game/card-layout.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDraft } from '#lib/server/card-drafts.ts';
import { currentMonth, getCard, isEditable } from '#lib/server/cards.ts';
import { formatEditDeadline } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'Your card is not available right now.');
	const timezone = user.timezone ?? 'UTC';
	const now = new Date();
	const month = currentMonth({ timezone }, now);
	const [card, draft] = await Promise.all([
		getCard(db, user.id, month),
		getDraft(db, user.id, month)
	]);

	if (!card) {
		return {
			monthName: monthName(month),
			card: null,
			hasDraft: draft.size !== null,
			editable: false,
			deadline: null
		};
	}
	const editable = isEditable(card, now);
	return {
		monthName: monthName(month),
		card: {
			size: card.size,
			rewards: card.rewards,
			squares: card.squares.map((square) =>
				square.isFree
					? { emoji: '', name: 'Free', state: initialSquareState({ isFree: true }) }
					: { emoji: square.emoji, name: square.name, state: initialSquareState(square) }
			)
		},
		hasDraft: false,
		editable,
		deadline: editable ? formatEditDeadline(card.editableUntil, timezone) : null
	};
};
