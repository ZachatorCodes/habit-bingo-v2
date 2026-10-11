import { error, fail, redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';
import { getAuth } from '#lib/server/auth/index.ts';
import {
	DEFAULT_SIGNED_IN_PATH,
	safeNextPath,
	signInWithPassword,
	WRONG_CREDENTIALS_MESSAGE
} from '#lib/server/auth/sign-in.ts';
import { getDb } from '#lib/server/db/client.ts';
import type { Actions, PageServerLoad } from './$types';

type Field = 'username' | 'password' | 'form';

/** Longer than any real username; longer input is refused before it reaches the database. */
const MAX_USERNAME_INPUT = 64;

export const load: PageServerLoad = ({ url, locals }) => {
	if (locals.user) redirect(303, DEFAULT_SIGNED_IN_PATH);
	return {
		next: safeNextPath(url.searchParams.get('next')),
		googleEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
	};
};

export const actions: Actions = {
	signin: async ({ request, locals }) => {
		const formData = await request.formData();
		const text = (key: string) => {
			const value = formData.get(key);
			return typeof value === 'string' ? value : '';
		};
		const next = safeNextPath(text('next'));
		if (locals.user) redirect(303, next);

		const username = text('username').trim();
		const password = text('password');
		// Echoed back on errors so nobody retypes it. Never the password.
		const values = { username };

		const failWith = (errors: Partial<Record<Field, string>>) => fail(400, { values, errors });

		const errors: Partial<Record<Field, string>> = {};
		if (!username) errors.username = 'Enter your username.';
		if (!password) errors.password = 'Enter your password.';
		if (errors.username || errors.password) return failWith(errors);
		if (username.length > MAX_USERNAME_INPUT) return failWith({ form: WRONG_CREDENTIALS_MESSAGE });

		const db = getDb();
		if (!db) error(503, 'Sign-in is not available right now.');
		const result = await signInWithPassword(
			getAuth(),
			db,
			{ username, password },
			request.headers,
			new Date()
		);
		if (!result.ok) return failWith({ form: result.message });

		redirect(303, next);
	}
};
