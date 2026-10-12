import { redirect } from '@sveltejs/kit';

/**
 * The signed-in user, or a redirect to sign in. Call it in every server load and action that needs
 * a user: layout guards do not protect form actions.
 */
export function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) redirect(303, '/signin');
	return locals.user;
}
