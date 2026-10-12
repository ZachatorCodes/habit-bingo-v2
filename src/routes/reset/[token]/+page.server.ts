import { error, fail, redirect } from '@sveltejs/kit';
import { getAuth } from '#lib/server/auth/index.ts';
import { getResetStatus, useResetLink } from '#lib/server/auth/password-reset.ts';
import { isPwnedPassword } from '#lib/server/auth/pwned.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/**
 * The token in this URL is a bearer secret: never cache the page and never send the URL on as a
 * referrer (the security-headers hook keeps this stricter policy). Public, so signed-in visitors
 * can use a link too.
 */
function protectToken(setHeaders: RequestEvent['setHeaders']) {
	setHeaders({ 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
}

function requireDb() {
	const db = getDb();
	if (!db) error(503, 'Password resets are not available right now.');
	return db;
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	protectToken(setHeaders);
	return { status: await getResetStatus(requireDb(), params.token, new Date()) };
};

export const actions: Actions = {
	default: async ({ params, request, setHeaders }) => {
		protectToken(setHeaders);
		const db = requireDb();
		const value = (await request.formData()).get('newPassword');
		const newPassword = typeof value === 'string' ? value : '';
		if (!newPassword) return fail(400, { errors: { newPassword: 'Enter a new password.' } });

		const result = await useResetLink(
			getAuth(),
			db,
			params.token,
			newPassword,
			new Date(),
			isPwnedPassword
		);
		if (!result.ok) {
			// Returning re-runs load, which shows the dead-link page.
			if (result.field === 'link') return fail(400, { status: result.status });
			return fail(400, { errors: { newPassword: result.message } });
		}
		redirect(303, '/signin?reset=done');
	}
};
