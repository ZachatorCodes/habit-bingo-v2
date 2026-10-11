import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { signInFailure, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import type { Auth } from './create-auth.ts';
import { createInvite } from './invites.ts';
import { isLockedOut, recordFailure } from './sign-in-throttle.ts';
import {
	LOCKED_OUT_MESSAGE,
	safeNextPath,
	signInWithPassword,
	WRONG_CREDENTIALS_MESSAGE
} from './sign-in.ts';
import { signUpWithPassword } from './sign-up.ts';
import { createTestAuth } from './test-auth.ts';

const PASSWORD = 'correct horse battery';
const now = new Date();

let db: Db;
let auth: Auth;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db);
	const inviterId = crypto.randomUUID();
	await db
		.insert(user)
		.values({ id: inviterId, name: 'Inviter', email: `${inviterId}@users.invalid` });
	const { code } = await createInvite(
		db,
		{ createdBy: inviterId, expiresInDays: 7, maxUses: 10 },
		now
	);
	const created = await signUpWithPassword(
		auth,
		{ username: 'Zach_S', password: PASSWORD, name: 'Zach' },
		new Headers({ cookie: `hb_invite=${code}` })
	);
	expect(created).toEqual({ ok: true });
});

function signIn(username: string, password: string) {
	return signInWithPassword(auth, db, { username, password }, new Headers(), now);
}

async function failures() {
	return (await db.select().from(signInFailure)).length;
}

describe('signInWithPassword', () => {
	it('copy matches the global constraints', () => {
		expect(WRONG_CREDENTIALS_MESSAGE).toBe('Wrong username or password.');
		expect(LOCKED_OUT_MESSAGE).toBe('Too many attempts. Try again in a few minutes.');
	});

	it('signs in with the right password, in any casing', async () => {
		expect(await signIn('ZACH_s', PASSWORD)).toEqual({ ok: true });
	});

	it('a wrong password and an unknown username give the same message', async () => {
		const wrong = await signIn('zach_s', 'not the right password');
		const unknown = await signIn('ghost_user', PASSWORD);
		expect(wrong).toEqual({ ok: false, message: 'Wrong username or password.' });
		expect(unknown).toEqual(wrong);
		expect(await failures()).toBe(2);
	});

	it('a malformed username fails the same way', async () => {
		expect(await signIn('no spaces!', PASSWORD)).toEqual({
			ok: false,
			message: 'Wrong username or password.'
		});
		expect(await failures()).toBe(1);
	});

	it('locks a real username after 5 failures, even with the right password', async () => {
		for (let i = 0; i < 5; i++) await signIn('zach_s', 'not the right password');
		const spy = vi.spyOn(auth.api, 'signInUsername');
		expect(await signIn('zach_s', PASSWORD)).toEqual({
			ok: false,
			message: 'Too many attempts. Try again in a few minutes.'
		});
		expect(spy).not.toHaveBeenCalled();
	});

	it('unknown usernames lock out too', async () => {
		for (let i = 0; i < 5; i++) {
			expect(await signIn('ghost_user', PASSWORD)).toEqual({
				ok: false,
				message: 'Wrong username or password.'
			});
		}
		expect(await signIn('ghost_user', PASSWORD)).toEqual({
			ok: false,
			message: 'Too many attempts. Try again in a few minutes.'
		});
		// A locked attempt is not recorded, so the lock still ends 15 minutes after the 5th failure.
		expect(await failures()).toBe(5);
	});

	it('a successful sign-in clears the failure count', async () => {
		for (let i = 0; i < 4; i++) await recordFailure(db, 'zach_s', now);
		expect(await signIn('Zach_S', PASSWORD)).toEqual({ ok: true });
		expect(await failures()).toBe(0);
		await signIn('zach_s', 'not the right password');
		expect(await isLockedOut(db, 'zach_s', now)).toBe(false);
	});

	it('a user with no password fails like a wrong password, after a hash', async () => {
		// A Google-only account: a user row and no credential account (Review Focus 5).
		const id = crypto.randomUUID();
		await db.insert(user).values({
			id,
			name: 'Google User',
			email: `${id}@users.invalid`,
			username: 'google_only',
			displayUsername: 'Google_Only'
		});
		const context = await auth.$context;
		const hash = vi.spyOn(context.password, 'hash');
		const signInUsername = vi.spyOn(auth.api, 'signInUsername');

		expect(await signIn('Google_Only', PASSWORD)).toEqual({
			ok: false,
			message: 'Wrong username or password.'
		});
		expect(hash).toHaveBeenCalledWith(PASSWORD);
		expect(signInUsername).not.toHaveBeenCalled();
		expect(await failures()).toBe(1);
	});

	it('concurrent attempts cannot get past the lockout', async () => {
		const signInUsername = vi.spyOn(auth.api, 'signInUsername');
		const results = await Promise.all(
			Array.from({ length: 10 }, () => signIn('zach_s', 'not the right password'))
		);
		expect(signInUsername.mock.calls.length).toBeLessThanOrEqual(5);
		const locked = results.filter((r) => !r.ok && r.message === LOCKED_OUT_MESSAGE);
		expect(locked.length).toBe(10 - signInUsername.mock.calls.length);
		expect(await failures()).toBeLessThanOrEqual(5);
		expect(await isLockedOut(db, 'zach_s', now)).toBe(true);
	});
});

describe('safeNextPath', () => {
	it.each([
		['/me', '/me'],
		['/today?tab=board#top', '/today?tab=board#top'],
		[null, '/today'],
		['', '/today'],
		['//evil.example', '/today'],
		['/\\evil.example', '/today'],
		['https://evil.example/today', '/today'],
		['javascript:alert(1)', '/today'],
		['today', '/today'],
		['/\t/evil.example', '/today'],
		// Dot segments that normalize to a protocol-relative URL.
		['/..//evil.example', '/today'],
		['/.//evil.example', '/today'],
		['/a/..//evil.example', '/today'],
		['/%2e%2e//evil.example', '/today'],
		['/a/../b', '/b']
	])('%j → %j', (next, expected) => {
		expect(safeNextPath(next)).toBe(expected);
	});
});
