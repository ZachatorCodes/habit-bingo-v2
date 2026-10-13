import { error, fail, redirect } from '@sveltejs/kit';
import { TEST_CLOCK } from '$app/env/private';
import { backfillDates } from '#lib/game/backfill.ts';
import { monthName } from '#lib/game/calendar.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import { progressText, todaySection, type TodaySection } from '#lib/game/today.ts';
import type { TodayRowData } from '#lib/components/TodayRow.svelte';
import { requireUser } from '#lib/server/auth/guards.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { getCheckIns, logCheckIn } from '#lib/server/check-ins.ts';
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
		done: [],
		anytime: [],
		slip: []
	};
	for (const square of card.squares) {
		if (square.isCenter) continue;
		const counts = checkIns.get(square.id) ?? new Map<string, number>();
		sections[todaySection(square, card, counts, day)].push({
			squareId: square.id,
			emoji: square.emoji,
			name: square.name,
			...evaluateSquare(square, card, counts, today),
			text: progressText(square, card, counts, day, today),
			count: counts.get(day) ?? 0
		});
	}
	return {
		monthName: monthName(month),
		card: { today, day, days, sections },
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
