import { error, fail, redirect } from '@sveltejs/kit';
import { AVATAR_EMOJI, isValidTimezone, type WeekStart } from '#lib/profile.ts';
import { completeOnboarding } from '#lib/server/auth/accounts.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

type Field = 'username' | 'name' | 'avatarEmoji' | 'timezone' | 'weekStartsOn' | 'form';

// This page sits outside the (app) group, so it guards itself.
export const load: PageServerLoad = ({ locals, setHeaders }) => {
	const user = requireUser(locals);
	if (user.onboardedAt) redirect(303, '/today');
	setHeaders({ 'cache-control': 'private, no-store' });
	return {
		needsUsername: !user.username,
		name: user.name,
		avatarEmoji: (AVATAR_EMOJI as readonly string[]).includes(user.avatarEmoji ?? '')
			? (user.avatarEmoji as string)
			: AVATAR_EMOJI[0],
		avatars: AVATAR_EMOJI
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals);
		if (user.onboardedAt) redirect(303, '/today');
		const db = getDb();
		if (!db) error(503, 'Onboarding is not available right now.');

		const formData = await request.formData();
		const text = (key: string) => {
			const value = formData.get(key);
			return typeof value === 'string' ? value : '';
		};
		const values = {
			username: text('username'),
			name: text('name'),
			avatarEmoji: text('avatarEmoji'),
			timezone: text('timezone'),
			weekStartsOn: text('weekStartsOn')
		};

		// Without JavaScript the hidden fields arrive pre-filled with these server defaults.
		const result = await completeOnboarding(
			db,
			user.id,
			{
				username: values.username,
				name: values.name,
				avatarEmoji: values.avatarEmoji,
				// The browser's zone name can be one this server's ICU does not know (Asia/Calcutta vs
				// Asia/Kolkata); the field is hidden, so fall back to UTC rather than dead-end. It is
				// editable later in settings.
				timezone: isValidTimezone(values.timezone) ? values.timezone : 'UTC',
				weekStartsOn: (values.weekStartsOn || 'monday') as WeekStart
			},
			new Date()
		);
		if (!result.ok) {
			const errors: Partial<Record<Field, string>> = { [result.field as Field]: result.message };
			return fail(400, { values, errors });
		}
		// Step 2 of first-run onboarding (spec §4.2): start the habit library.
		redirect(303, '/me/habits?welcome=1');
	}
};
