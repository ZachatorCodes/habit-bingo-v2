import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/client.ts';
import { deleteHabit, getHabit } from '#lib/server/habits.ts';
import type { Actions, PageServerLoad } from './$types';

function requireDb() {
	const db = getDb();
	if (!db) error(503, 'Your habits are not available right now.');
	return db;
}

/** The confirmation for deleting an archived habit forever (the no-JavaScript path). */
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const habit = await getHabit(requireDb(), user.id, params.id);
	if (!habit) error(404, 'Not found');
	if (habit.archivedAt === null) redirect(303, '/me/habits');
	return { habit: { id: habit.id, emoji: habit.emoji, name: habit.name } };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const user = requireUser(locals);
		const result = await deleteHabit(requireDb(), user.id, params.id);
		if (result === false) error(404, 'Not found');
		if (result === 'active')
			return fail(400, { message: 'Archive this habit before deleting it.' });
		redirect(303, '/me/habits?archived=1&deleted=1');
	}
};
