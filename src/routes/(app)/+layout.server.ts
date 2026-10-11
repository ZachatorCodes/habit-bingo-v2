import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		redirect(303, '/signin?next=' + encodeURIComponent(url.pathname + url.search));
	}
	// The onboarding page arrives in Task 6.
	if (!locals.user.onboardedAt) redirect(303, '/onboarding');
	// Personal pages: never stored by a shared cache.
	setHeaders({ 'cache-control': 'private, no-store' });

	const { id, username, displayUsername, name, avatarEmoji, isAdmin } = locals.user;
	return {
		user: {
			id,
			displayUsername: displayUsername ?? username ?? name,
			name,
			avatarEmoji: avatarEmoji ?? '🙂',
			isAdmin: isAdmin ?? false
		}
	};
};
