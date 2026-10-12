import { error } from '@sveltejs/kit';
import { monthName } from '#lib/game/calendar.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'Today is not available right now.');
	const month = currentMonth({ timezone: user.timezone ?? 'UTC' }, new Date());
	return { monthName: monthName(month), hasCard: (await getCard(db, user.id, month)) !== null };
};
