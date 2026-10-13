import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { firstOpenStep, getDraft } from '#lib/server/card-drafts.ts';
import { TEST_CLOCK } from '$app/env/private';
import { requestNow } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'The card builder is not available right now.');
	const month = currentMonth({ timezone: user.timezone ?? 'UTC' }, requestNow(cookies, TEST_CLOCK));
	const [card, draft] = await Promise.all([
		getCard(db, user.id, month),
		getDraft(db, user.id, month)
	]);
	if (card && draft.cardId !== card.id) redirect(303, '/card');
	redirect(303, `/card/build/${firstOpenStep(draft)}`);
};
