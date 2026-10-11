import { error, fail, redirect } from '@sveltejs/kit';
import * as z from 'zod';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';
import { INVITE_COOKIE } from '#lib/server/auth/create-auth.ts';
import { getAuth } from '#lib/server/auth/index.ts';
import { getInviteStatus } from '#lib/server/auth/invites.ts';
import { checkPassword, PASSWORD_MESSAGES } from '#lib/server/auth/password-policy.ts';
import { signUpWithPassword, USERNAME_RULES_MESSAGE } from '#lib/server/auth/sign-up.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

type Field = 'username' | 'name' | 'password' | 'form';

const signUpForm = z
	.object({
		username: z
			.string({ error: USERNAME_RULES_MESSAGE })
			.trim()
			.regex(/^[a-z0-9_]{3,20}$/i, { error: USERNAME_RULES_MESSAGE }),
		name: z
			.string({ error: 'Enter a display name.' })
			.trim()
			.min(1, { error: 'Enter a display name.' })
			.max(40, { error: 'Use at most 40 characters.' }),
		password: z.string({ error: PASSWORD_MESSAGES.tooShort })
	})
	.superRefine(async ({ username, password }, ctx) => {
		// The local rules only, so every field's problem shows at once. The breach lookup runs in the
		// sign-up hook, after these pass.
		const problem = await checkPassword(password, username, async () => false);
		if (problem)
			ctx.addIssue({ code: 'custom', path: ['password'], message: PASSWORD_MESSAGES[problem] });
	});

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	if (locals.user) redirect(303, '/today');
	const db = getDb();
	if (!db) error(503, 'Sign-up is not available right now.');

	const status = await getInviteStatus(db, params.code, new Date());
	// Dead invites get a friendly page and no cookie (Review Focus 3).
	if (status !== 'valid') return { status };

	// Read again when the account is created, by either sign-up method.
	cookies.set(INVITE_COOKIE, params.code, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 3600
	});
	return { status, googleEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) };
};

export const actions: Actions = {
	signup: async ({ request, cookies, locals }) => {
		if (locals.user) redirect(303, '/today');
		const formData = await request.formData();
		const text = (key: string) => {
			const value = formData.get(key);
			return typeof value === 'string' ? value : '';
		};
		// Echoed back on errors so nobody retypes them. Never the password.
		const values = { username: text('username'), name: text('name') };

		const parsed = await signUpForm.safeParseAsync({
			username: formData.get('username'),
			name: formData.get('name'),
			password: formData.get('password')
		});
		if (!parsed.success) {
			const errors: Partial<Record<Field, string>> = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0] as Field;
				errors[field] ??= issue.message;
			}
			return fail(400, { values, errors });
		}

		const result = await signUpWithPassword(getAuth(), parsed.data, request.headers);
		if (!result.ok) {
			const errors: Partial<Record<Field, string>> = { [result.field]: result.message };
			return fail(400, { values, errors });
		}

		cookies.delete(INVITE_COOKIE, { path: '/' });
		redirect(303, '/onboarding');
	}
};
