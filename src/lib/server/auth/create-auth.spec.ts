import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { account, invite, session, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { DISABLED_PATHS, type Auth } from './create-auth.ts';
import { createInvite, getInviteStatus } from './invites.ts';
import { createTestAuth } from './test-auth.ts';

const PASSWORD = 'correct horse battery';

let db: Db;
let auth: Auth;
let inviterId: string;
/** A roomy invite that the ordinary sign-ups in these tests use. */
let inviteCode: string;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db);
	inviterId = crypto.randomUUID();
	await db
		.insert(user)
		.values({ id: inviterId, name: 'Inviter', email: `${inviterId}@users.invalid` });
	inviteCode = await newInvite(1000);
});

async function newInvite(maxUses: number) {
	const { code } = await createInvite(
		db,
		{ createdBy: inviterId, expiresInDays: 7, maxUses },
		new Date()
	);
	return code;
}

function inviteHeaders(code: string | null) {
	return new Headers(code === null ? {} : { cookie: `hb_invite=${code}` });
}

function signUp(username: string, password = PASSWORD, code: string | null = inviteCode) {
	return auth.api.signUpEmail({
		body: { email: `${crypto.randomUUID()}@users.invalid`, password, name: 'Zach', username },
		headers: inviteHeaders(code)
	});
}

async function usesOf(code: string) {
	const [row] = await db.select().from(invite).where(eq(invite.code, code));
	return row.uses;
}

/** Signs in and returns request headers carrying the session cookie. */
async function signInCookie(username: string, password = PASSWORD) {
	const { headers } = await auth.api.signInUsername({
		body: { username, password },
		returnHeaders: true
	});
	const cookie = headers
		.getSetCookie()
		.map((c) => c.split(';')[0])
		.join('; ');
	return new Headers({ cookie });
}

function apiError(status: string, code: string, message?: string) {
	return expect.objectContaining({
		status,
		body: expect.objectContaining(message === undefined ? { code } : { code, message })
	});
}

describe('createAuth', () => {
	it('signs up a username user and signs them in case-insensitively', async () => {
		const { user: created } = await signUp('Zach_S');
		const [row] = await db.select().from(user).where(eq(user.id, created.id));
		expect(row.username).toBe('zach_s');
		expect(row.displayUsername).toBe('Zach_S');

		const signedIn = await auth.api.signInUsername({
			body: { username: 'ZACH_S', password: PASSWORD }
		});
		expect(signedIn?.token).toEqual(expect.any(String));
	});

	it('stores scrypt hashes, never the password', async () => {
		const { user: created } = await signUp('hasher');
		const [credential] = await db.select().from(account).where(eq(account.userId, created.id));
		expect(credential.password).not.toBe(PASSWORD);
		expect(credential.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
	});

	it('applies the profile defaults', async () => {
		const { user: created } = await signUp('defaults');
		const [row] = await db.select().from(user).where(eq(user.id, created.id));
		expect(row).toMatchObject({
			avatarEmoji: '🙂',
			timezone: 'UTC',
			weekStartsOn: 'monday',
			isAdmin: false,
			onboardedAt: null
		});
	});

	it('does not let sign-up set admin or onboarding fields', async () => {
		const sneaky = (username: string, extra: object) =>
			auth.api.signUpEmail({
				body: {
					email: `${crypto.randomUUID()}@users.invalid`,
					password: PASSWORD,
					name: 'Sneaky',
					username,
					...extra
				} as never,
				headers: inviteHeaders(inviteCode)
			});

		// Better Auth replaces an input: false field that has a default, and rejects one without.
		const { user: created } = await sneaky('sneaky', { isAdmin: true });
		const [row] = await db.select().from(user).where(eq(user.id, created.id));
		expect(row.isAdmin).toBe(false);
		await expect(sneaky('sneakier', { onboardedAt: new Date() })).rejects.toThrow(
			'onboardedAt is not allowed to be set'
		);
	});

	it.each(['ab', 'a'.repeat(21), 'bad-name'])('rejects the username %j', async (username) => {
		await expect(signUp(username)).rejects.toThrow();
	});

	it('enforces the 10–128 character password length', async () => {
		await expect(signUp('shortpw', 'a'.repeat(9))).rejects.toThrow();
		await expect(signUp('longpw', 'a'.repeat(129))).rejects.toThrow();
	});

	// Routes that would bypass our invite, lockout and breach rules, reveal whether a username
	// exists, or that the app simply does not use. Listed here as well as in DISABLED_PATHS so
	// dropping one from the config fails a test.
	const MUST_NOT_BE_ROUTED = [
		...DISABLED_PATHS,
		'/sign-in/username',
		'/is-username-available',
		'/verify-password',
		'/sign-in/social',
		'/get-access-token',
		'/refresh-token',
		'/account-info',
		'/list-accounts',
		'/list-sessions',
		'/revoke-session',
		'/revoke-other-sessions',
		'/update-session',
		'/verify-email',
		'/send-verification-email',
		'/change-email',
		'/delete-user/callback',
		// Parameterized: Better Auth's disabledPaths only matches exact paths.
		'/reset-password/some-token',
		'/reset-password/some-token/',
		'/reset-password/some-token?callbackURL=/somewhere'
	];

	describe.each(['GET', 'POST'])('over HTTP %s', (method) => {
		it.each([...new Set(MUST_NOT_BE_ROUTED)])('does not route %s', async (path) => {
			const res = await auth.handler(
				new Request(`http://localhost/api/auth${path}`, {
					method,
					headers: { 'content-type': 'application/json', origin: 'http://localhost' },
					body: method === 'POST' ? '{}' : undefined
				})
			);
			expect(res.status).toBe(404);
			expect(await res.text()).toBe('Not Found');
		});
	});

	it('still answers the routes the app uses', async () => {
		const google = createTestAuth(db, { google: { clientId: 'id', clientSecret: 'secret' } });
		const get = (path: string) => google.handler(new Request(`http://localhost/api/auth${path}`));
		// Control: the handler itself is mounted and answering.
		expect((await get('/ok')).status).toBe(200);
		expect((await get('/get-session')).status).toBe(200);
		// The Google OAuth callback (here without state, so it redirects with an error).
		expect((await get('/callback/google')).status).toBe(302);
		const signOut = await google.handler(
			new Request('http://localhost/api/auth/sign-out', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost' },
				body: '{}'
			})
		);
		expect(signOut.status).toBe(200);
	});

	it.each([
		['no state', ''],
		['an unknown state', '?state=forged&code=abc']
	])('sends a Google callback with %s back to /signin with an error', async (_, query) => {
		const google = createTestAuth(db, { google: { clientId: 'id', clientSecret: 'secret' } });
		const res = await google.handler(
			new Request(`http://localhost/api/auth/callback/google${query}`)
		);
		expect(res.status).toBe(302);
		const location = new URL(res.headers.get('location') ?? '', 'http://localhost');
		expect(location.origin).toBe('http://localhost');
		expect(location.pathname).toBe('/signin');
		expect(location.searchParams.get('error')).toBeTruthy();
	});

	it('deleting a user cascades to their sessions and accounts', async () => {
		const { user: created } = await signUp('cascade');
		await auth.api.signInUsername({ body: { username: 'cascade', password: PASSWORD } });
		expect(await db.select().from(session).where(eq(session.userId, created.id))).not.toEqual([]);

		await db.delete(user).where(eq(user.id, created.id));

		expect(await db.select().from(session).where(eq(session.userId, created.id))).toEqual([]);
		expect(await db.select().from(account).where(eq(account.userId, created.id))).toEqual([]);
	});
});

describe('invites at sign-up', () => {
	it('refuses sign-up without an invite cookie', async () => {
		await expect(signUp('uninvited', PASSWORD, null)).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED', 'You need an invite to join.')
		);
		expect(await db.select().from(user).where(eq(user.username, 'uninvited'))).toEqual([]);
	});

	it('refuses an unknown invite code', async () => {
		await expect(signUp('mistyped', PASSWORD, 'not-a-real-code')).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
	});

	it('signs up with a valid invite and counts the use', async () => {
		const code = await newInvite(2);
		const { user: created } = await signUp('invited', PASSWORD, code);
		expect(created.username).toBe('invited');
		expect(await usesOf(code)).toBe(1);
	});

	it('refuses a used-up invite', async () => {
		const code = await newInvite(1);
		await signUp('first', PASSWORD, code);
		await expect(signUp('second', PASSWORD, code)).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
		expect(await getInviteStatus(db, code, new Date())).toBe('usedUp');
	});

	it('a sign-up rejected for a taken username does not use the invite', async () => {
		await signUp('taken');
		const code = await newInvite(1);
		await expect(signUp('TAKEN', PASSWORD, code)).rejects.toThrow();
		expect(await usesOf(code)).toBe(0);
		expect(await getInviteStatus(db, code, new Date())).toBe('valid');
	});

	it('a sign-up rejected for a breached password does not use the invite', async () => {
		auth = createTestAuth(db, { isPwned: async () => true });
		const code = await newInvite(1);
		await expect(signUp('breachy', PASSWORD, code)).rejects.toEqual(
			apiError('BAD_REQUEST', 'breached')
		);
		expect(await usesOf(code)).toBe(0);
	});
});

describe('bootstrap invite', () => {
	const BOOTSTRAP = 'bootstrap-code-for-tests';

	beforeEach(async () => {
		db = await createTestDb(); // no users at all
		auth = createTestAuth(db, { bootstrapInviteCode: BOOTSTRAP });
	});

	it('the bootstrap code creates the first user as admin and is inert afterwards', async () => {
		const { user: first } = await signUp('owner', PASSWORD, BOOTSTRAP);
		const [row] = await db.select().from(user).where(eq(user.id, first.id));
		expect(row.isAdmin).toBe(true);

		await expect(signUp('latecomer', PASSWORD, BOOTSTRAP)).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
	});

	it('the first user still needs the bootstrap code', async () => {
		await expect(signUp('owner', PASSWORD, 'some-other-code')).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
		await expect(signUp('owner', PASSWORD, null)).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
	});

	it('an unset bootstrap code never matches an empty cookie', async () => {
		auth = createTestAuth(db, { bootstrapInviteCode: undefined });
		await expect(signUp('owner', PASSWORD, '')).rejects.toEqual(
			apiError('FORBIDDEN', 'INVITE_REQUIRED')
		);
	});
});

describe('password policy hooks', () => {
	it('rejects a sign-up password equal to the username', async () => {
		await expect(signUp('Zach_Stuff1', 'zach_stuff1')).rejects.toEqual(
			apiError('BAD_REQUEST', 'sameAsUsername', "Your password can't be your username.")
		);
	});

	it('rejects a password equal to a displayUsername sent without a username', async () => {
		// The username plugin copies displayUsername into username when username is absent.
		await expect(
			auth.api.signUpEmail({
				body: {
					email: `${crypto.randomUUID()}@users.invalid`,
					password: 'zach_stuff1',
					name: 'Zach',
					displayUsername: 'Zach_Stuff1'
				} as never,
				headers: inviteHeaders(inviteCode)
			})
		).rejects.toEqual(apiError('BAD_REQUEST', 'sameAsUsername'));
		expect(await db.select().from(user).where(eq(user.username, 'zach_stuff1'))).toEqual([]);
	});

	it('rejects a breached sign-up password with the copy', async () => {
		auth = createTestAuth(db, { isPwned: async () => true });
		await expect(signUp('breachy')).rejects.toEqual(
			apiError(
				'BAD_REQUEST',
				'breached',
				'This password has appeared in a data breach. Choose a different one.'
			)
		);
	});

	it('checks the new password on change-password against the session user', async () => {
		await signUp('changer_one');
		const headers = await signInCookie('changer_one');
		await expect(
			auth.api.changePassword({
				body: { currentPassword: PASSWORD, newPassword: 'Changer_One' },
				headers
			})
		).rejects.toEqual(apiError('BAD_REQUEST', 'sameAsUsername'));

		await auth.api.changePassword({
			body: { currentPassword: PASSWORD, newPassword: 'a brand new passphrase' },
			headers
		});
		expect(
			await auth.api.signInUsername({
				body: { username: 'changer_one', password: 'a brand new passphrase' }
			})
		).toMatchObject({ token: expect.any(String) });
	});

	it('rejects a breached password on change-password', async () => {
		let pwned = false;
		auth = createTestAuth(db, { isPwned: async () => pwned });
		await signUp('changer_two');
		const headers = await signInCookie('changer_two');
		pwned = true;
		await expect(
			auth.api.changePassword({
				body: { currentPassword: PASSWORD, newPassword: 'a brand new passphrase' },
				headers
			})
		).rejects.toEqual(apiError('BAD_REQUEST', 'breached'));
	});

	it('checks the new password on set-password', async () => {
		await signUp('setter_name');
		const headers = await signInCookie('setter_name');
		await expect(
			auth.api.setPassword({ body: { newPassword: 'SETTER_x' }, headers })
		).rejects.toEqual(apiError('BAD_REQUEST', 'tooShort'));
		await expect(
			auth.api.setPassword({ body: { newPassword: 'Setter_Name' }, headers })
		).rejects.toEqual(apiError('BAD_REQUEST', 'sameAsUsername'));
	});
});
