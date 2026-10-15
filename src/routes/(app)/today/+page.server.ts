import { error, fail, redirect } from '@sveltejs/kit';
import { TEST_CLOCK } from '$app/env/private';
import { backfillDates } from '#lib/game/backfill.ts';
import { monthName } from '#lib/game/calendar.ts';
import { CARD_SIZES } from '#lib/game/card-layout.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import { progressText, todaySection, type TodaySection } from '#lib/game/today.ts';
import type { TodayRowData } from '#lib/components/TodayRow.svelte';
import { requireUser } from '#lib/server/auth/guards.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { cardView } from '#lib/server/card-view.ts';
import { getCheckIns, logCheckIn, MAX_COUNT } from '#lib/server/check-ins.ts';
import { localDate, requestNow } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

function requireDb() {
	const db = getDb();
	if (!db) error(503, 'Today is not available right now.');
	return db;
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const user = requireUser(locals);
	const db = requireDb();
	const timezone = user.timezone ?? 'UTC';
	const now = requestNow(cookies, TEST_CLOCK);
	const month = currentMonth({ timezone }, now);
	const card = await getCard(db, user.id, month);
	if (!card) return { monthName: monthName(month), card: null };

	const today = localDate(now, timezone);
	const days = backfillDates(today, card.startDate);
	const asked = url.searchParams.get('day');
	// Only the backfill window can be logged; anything else shows today.
	const day = asked && days.includes(asked) ? asked : today;
	const checkIns = await getCheckIns(db, card.id);

	const sections: Record<TodaySection, TodayRowData[]> = {
		doToday: [],
		thisWeek: [],
		done: [],
		anytime: [],
		slip: []
	};
	for (const square of card.squares) {
		if (square.isCenter) continue;
		const counts = checkIns.get(square.id) ?? new Map<string, number>();
		const count = counts.get(day) ?? 0;
		// The row as it is, and as it will be after one more check-in or one fewer, so the page can
		// show the result before the server answers (spec §6).
		const view = (dayCount: number) => {
			const next = new Map(counts);
			if (dayCount > 0) next.set(day, dayCount);
			else next.delete(day);
			return {
				...evaluateSquare(square, card, next, today),
				text: progressText(square, card, next, day, today),
				count: dayCount
			};
		};
		sections[todaySection(square, card, counts, day)].push({
			squareId: square.id,
			emoji: square.emoji,
			name: square.name,
			...view(count),
			ifLogged: view(Math.min(count + 1, MAX_COUNT)),
			ifUndone: count > 0 ? view(count - 1) : null
		});
	}
	return {
		monthName: monthName(month),
		card: {
			today,
			day,
			days,
			sections,
			// The card's score, so a log that completes a line can celebrate here too (spec §4.7).
			score: (await cardView(db, user.id, card, today)).score,
			rewards: card.rewards,
			sixtyThreshold: CARD_SIZES[card.size].sixtyThreshold
		},
		/** The page's own query, carried through the log/unlog actions. */
		keep: day === today ? '' : `&day=${day}`
	};
};

async function log(
	{ locals, cookies, request, url }: Parameters<Actions[string]>[0],
	delta: 1 | -1
) {
	const user = requireUser(locals);
	const data = await request.formData();
	const field = (name: string) => {
		const value = data.get(name);
		return typeof value === 'string' ? value : '';
	};
	const result = await logCheckIn(
		requireDb(),
		{ id: user.id, timezone: user.timezone ?? 'UTC' },
		field('squareId'),
		field('date'),
		delta,
		requestNow(cookies, TEST_CLOCK)
	);
	if (result === null) error(404, 'Not found');
	if (!result.ok) return fail(400, { message: result.message });
	// Back to the day being logged, so a refresh doesn't post again.
	const day = url.searchParams.get('day');
	redirect(303, day ? `/today?day=${encodeURIComponent(day)}` : '/today');
}

export const actions: Actions = {
	log: (event) => log(event, 1),
	unlog: (event) => log(event, -1)
};
