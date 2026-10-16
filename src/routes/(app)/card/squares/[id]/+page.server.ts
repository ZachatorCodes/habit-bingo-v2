import { error, fail, redirect } from '@sveltejs/kit';
import { TEST_CLOCK } from '$app/env/private';
import { addDays } from '#lib/game/calendar.ts';
import { backfillDates } from '#lib/game/backfill.ts';
import { CATEGORIES } from '#lib/game/categories.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import { describeRule } from '#lib/game/habit-rules.ts';
import { stateText } from '#lib/game/state-text.ts';
import { progressText } from '#lib/game/today.ts';
import { clippedWeeks, weekOf } from '#lib/game/weeks.ts';
import type { SheetData } from '#lib/components/HabitSheet.svelte';
import { requireUser } from '#lib/server/auth/guards.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { getCheckIns, logCheckIn, setCheckIn } from '#lib/server/check-ins.ts';
import { localDate, requestNow } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

function requireDb() {
	const db = getDb();
	if (!db) error(503, 'Your card is not available right now.');
	return db;
}

/** One square of the person's current card, as the habit sheet shows it (spec §4.6). */
export const load: PageServerLoad = async ({ locals, cookies, params, url }) => {
	const user = requireUser(locals);
	const db = requireDb();
	const timezone = user.timezone ?? 'UTC';
	const now = requestNow(cookies, TEST_CLOCK);
	const card = await getCard(db, user.id, currentMonth({ timezone }, now));
	const square = card?.squares.find((s) => s.id === params.id && !s.isCenter);
	if (!card || !square || square.isCenter) error(404, 'Not found');

	const today = localDate(now, timezone);
	const days = backfillDates(today, card.startDate);
	const asked = url.searchParams.get('day');
	const day = asked && days.includes(asked) ? asked : today;
	const counts = (await getCheckIns(db, card.id)).get(square.id) ?? new Map<string, number>();
	const { state, progress } = evaluateSquare(square, card, counts, today);

	// History: this week's days for a week habit, otherwise the month so far.
	const week =
		square.period === 'week'
			? weekOf(clippedWeeks(square, card.startDate, card.weekStartsOn), day)
			: null;
	const from = week?.start ?? card.startDate;
	const to = week && week.end < today ? week.end : today;
	const history: SheetData['history'] = [];
	for (let d = from; d <= to; d = addDays(d, 1))
		history.push({ date: d, count: counts.get(d) ?? 0 });

	const category = CATEGORIES.find((c) => c.id === square.category)!;
	const sheet: SheetData = {
		id: square.id,
		icon: square.icon,
		name: square.name,
		category: category.label,
		rule: describeRule(square),
		countMode: square.period === 'day' ? 'times' : square.countMode,
		state,
		progress,
		stateText: stateText(square, card, counts, today, state),
		progressText: progressText(square, card, counts, day, today),
		today,
		day,
		days,
		count: counts.get(day) ?? 0,
		history: history.reverse()
	};
	return { sheet };
};

async function change(
	{ locals, cookies, params, request, url }: Parameters<Actions[string]>[0],
	how: 'log' | 'unlog' | 'set'
) {
	const user = requireUser(locals);
	const data = await request.formData();
	const date = String(data.get('date') ?? '');
	const person = { id: user.id, timezone: user.timezone ?? 'UTC' };
	const now = requestNow(cookies, TEST_CLOCK);
	const result =
		how === 'set'
			? await setCheckIn(requireDb(), person, params.id, date, Number(data.get('count')), now)
			: await logCheckIn(requireDb(), person, params.id, date, how === 'log' ? 1 : -1, now);
	if (result === null) error(404, 'Not found');
	if (!result.ok) return fail(400, { message: result.message });
	// Back to the sheet for that day, so a refresh never posts again.
	const day = url.searchParams.get('day');
	redirect(303, `/card/squares/${params.id}${day ? `?day=${encodeURIComponent(day)}` : ''}`);
}

export const actions: Actions = {
	log: (event) => change(event, 'log'),
	unlog: (event) => change(event, 'unlog'),
	set: (event) => change(event, 'set')
};
