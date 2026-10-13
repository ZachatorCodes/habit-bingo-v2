import { error, fail, redirect } from '@sveltejs/kit';
import { monthName, nextMonth } from '#lib/game/calendar.ts';
import { centerState, nextMonthOpens } from '#lib/game/next-month.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import { scoreCard, squarePoints } from '#lib/game/score.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { draftFromCard, getDraft, saveDraft } from '#lib/server/card-drafts.ts';
import { currentMonth, getCard, isEditable } from '#lib/server/cards.ts';
import { TEST_CLOCK } from '$app/env/private';
import { getCheckIns } from '#lib/server/check-ins.ts';
import { formatEditDeadline, localDate, requestNow } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'Your card is not available right now.');
	const timezone = user.timezone ?? 'UTC';
	const now = requestNow(cookies, TEST_CLOCK);
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
	// The center square (spec §3.5): free until the last 7 days, then it leads to next month's card.
	const today = localDate(now, timezone);
	const next = monthName(nextMonth(month));
	const [nextCard, checkIns] = await Promise.all([
		getCard(db, user.id, nextMonth(month)),
		getCheckIns(db, card.id)
	]);
	const nextBuilt = nextCard !== null;
	const state = centerState(month, today, nextBuilt);
	const center =
		today < nextMonthOpens(month)
			? { emoji: '⭐', name: 'Free', state }
			: state === 'buildNext'
				? { emoji: '🗓️', name: `Build ${next}'s card`, state, link: true }
				: { emoji: '🗓️', name: `${next} ready`, state, link: true };
	const squares = card.squares.map((square) => {
		if (square.isCenter) return { ...center, points: 0 };
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
	return {
		monthName: monthName(month),
		nextMonthName: next,
		card: {
			size: card.size,
			rewards: card.rewards,
			squares,
			score: scoreCard(card.size, squares)
		},
		hasDraft: false,
		editable,
		deadline: editable ? formatEditDeadline(card.editableUntil, timezone) : null
	};
};

export const actions: Actions = {
	/** Reopens the builder on the started card, while the 48 hours last. */
	edit: async ({ locals, cookies }) => {
		const user = requireUser(locals);
		const db = getDb();
		if (!db) error(503, 'Your card is not available right now.');
		const now = requestNow(cookies, TEST_CLOCK);
		const card = await getCard(
			db,
			user.id,
			currentMonth({ timezone: user.timezone ?? 'UTC' }, now)
		);
		if (!card) redirect(303, '/card/build');
		if (!isEditable(card, now)) return fail(400, { message: 'This card is locked.' });
		await saveDraft(db, user.id, draftFromCard(card));
		redirect(303, '/card/build/habits');
	}
};
