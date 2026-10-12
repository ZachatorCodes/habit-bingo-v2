import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { session } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { createTestAuth } from '#lib/server/auth/test-auth.ts';
import type { Auth } from '#lib/server/auth/index.ts';
import { actions } from './+page.server.ts';

const test = vi.hoisted(() => ({ auth: null as unknown }));

vi.mock('#lib/server/auth/index.ts', () => ({
	tryGetAuth: () => test.auth,
	getAuth: () => test.auth
}));

describe('sign out', () => {
	it('deletes the session even when the hook could not load it into locals', async () => {
		const db = await createTestDb();
		const auth = createTestAuth(db, { bootstrapInviteCode: 'BOOT' });
		test.auth = auth satisfies Auth;
		const { headers } = await auth.api.signUpEmail({
			body: {
				email: `${crypto.randomUUID()}@users.invalid`,
				password: 'correct horse battery',
				name: 'Zach',
				username: 'zach'
			},
			headers: new Headers({ cookie: 'hb_invite=BOOT' }),
			returnHeaders: true
		});
		const cookie = headers
			.getSetCookie()
			.map((c) => c.split(';')[0])
			.join('; ');
		expect(await db.select().from(session)).toHaveLength(1);

		// The session lookup in the hook failed (e.g. a database blip), so locals has no session.
		const event = {
			request: new Request('http://localhost/signout', {
				method: 'POST',
				headers: { cookie, origin: 'http://localhost' }
			}),
			locals: { user: null, session: null }
		} as never;
		const outcome = await Promise.resolve(actions.default(event)).catch((e: unknown) => e);

		expect(isRedirect(outcome) && outcome.location).toBe('/');
		expect(await db.select().from(session)).toEqual([]);
	});

	it('still redirects home when auth is not configured', async () => {
		test.auth = null;
		const event = {
			request: new Request('http://localhost/signout', { method: 'POST' }),
			locals: { user: null, session: null }
		} as never;
		const outcome = await Promise.resolve(actions.default(event)).catch((e: unknown) => e);
		expect(isRedirect(outcome) && outcome.location).toBe('/');
	});
});
