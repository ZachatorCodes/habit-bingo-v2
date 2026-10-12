import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { requireUser } from './guards.ts';

describe('requireUser', () => {
	it('returns the signed-in user', () => {
		const user = { id: 'u1' } as NonNullable<App.Locals['user']>;
		expect(requireUser({ user, session: null })).toBe(user);
	});

	it('sends signed-out visitors to sign in', () => {
		let thrown: unknown;
		try {
			requireUser({ user: null, session: null });
		} catch (error) {
			thrown = error;
		}
		expect(isRedirect(thrown)).toBe(true);
		expect(thrown).toMatchObject({ status: 303, location: '/signin' });
	});
});
