import { redirect } from '@sveltejs/kit';
import { tryGetAuth } from '#lib/server/auth/index.ts';
import type { Actions, PageServerLoad } from './$types';

// Signing out is a POST only, so a link or image elsewhere cannot sign anyone out.
export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request }) => {
		// Deletes the session row, so a copied cookie stops working too (Review Focus 4). Better Auth
		// clears the cookies on our response. Called whenever auth is configured, not only when
		// `locals.session` is set: a failed session lookup in the hook leaves locals empty while the
		// cookie is still valid. Without a session cookie it only clears cookies.
		await tryGetAuth()?.api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
