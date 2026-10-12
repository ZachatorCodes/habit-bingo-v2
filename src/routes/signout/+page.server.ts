import { redirect } from '@sveltejs/kit';
import { getAuth } from '#lib/server/auth/index.ts';
import type { Actions, PageServerLoad } from './$types';

// Signing out is a POST only, so a link or image elsewhere cannot sign anyone out.
export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Deletes the session row, so a copied cookie stops working too (Review Focus 4). Better Auth
		// clears the cookies on our response.
		if (locals.session) await getAuth().api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
