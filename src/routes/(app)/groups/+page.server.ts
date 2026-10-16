import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/client.ts';
import { listGroups } from '#lib/server/groups.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'Groups are not available right now.');
	return { groups: await listGroups(db, user.id) };
};
