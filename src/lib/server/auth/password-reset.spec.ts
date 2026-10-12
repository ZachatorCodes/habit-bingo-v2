import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { account, passwordReset, session, signInFailure, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import type { Auth } from './create-auth.ts';
import { PASSWORD_MESSAGES } from './password-policy.ts';
import {
	createResetLink,
	getResetStatus,
	RESET_LINK_TTL_MS,
	UNKNOWN_USERNAME_MESSAGE,
	useResetLink
} from './password-reset.ts';
import { createTestAuth } from './test-auth.ts';

let db: Db;
let auth: Auth;
const NOW = new Date('2026-10-11T12:00:00Z');
const NEW_PASSWORD = 'a brand new password 1';
const notPwned = async () => false;

const sha256hex = (value: string) => createHash('sha256').update(value).digest('hex');

async function makeUser(username: string, password?: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		name: username,
		email: `${id}@users.invalid`,
		username,
		displayUsername: username
	});
	if (password) {
		const hash = await (await auth.$context).password.hash(password);
		await db.insert(account).values({
			id: crypto.randomUUID(),
			userId: id,
			accountId: id,
			providerId: 'credential',
			password: hash
		});
	}
	return id;
}

async function addSession(userId: string): Promise<void> {
	await db.insert(session).values({
		id: crypto.randomUUID(),
		token: crypto.randomUUID(),
		userId,
		expiresAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
	});
}

async function passwordMatches(userId: string, password: string): Promise<boolean> {
	const [row] = await db
		.select({ hash: account.password })
		.from(account)
		.where(eq(account.userId, userId));
	if (!row?.hash) return false;
	return (await auth.$context).password.verify({ hash: row.hash, password });
}

async function issue(username: string, createdBy: string): Promise<string> {
	const result = await createResetLink(db, { username, createdBy }, NOW);
	if (!result.ok) throw new Error(result.message);
	return result.token;
}

let adminId: string;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db);
	adminId = await makeUser('the_admin', 'admin password 123');
});

describe('createResetLink', () => {
	it('stores only the SHA-256 of the token', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);

		// 32 random bytes, base64url.
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(Buffer.from(token, 'base64url')).toHaveLength(32);

		const rows = await db.select().from(passwordReset);
		expect(rows).toEqual([
			{
				tokenHash: sha256hex(token),
				userId,
				createdBy: adminId,
				expiresAt: new Date(NOW.getTime() + RESET_LINK_TTL_MS),
				usedAt: null
			}
		]);
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	it('issues a different token every time', async () => {
		await makeUser('alice', 'old password 1234');
		expect(await issue('alice', adminId)).not.toBe(await issue('alice', adminId));
	});

	it('finds the user whatever the casing or a leading @', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const result = await createResetLink(db, { username: ' @Alice ', createdBy: adminId }, NOW);
		expect(result.ok).toBe(true);
		const [row] = await db.select().from(passwordReset);
		expect(row.userId).toBe(userId);
	});

	it('rejects an unknown username', async () => {
		expect(await createResetLink(db, { username: 'nobody', createdBy: adminId }, NOW)).toEqual({
			ok: false,
			message: UNKNOWN_USERNAME_MESSAGE
		});
		expect(UNKNOWN_USERNAME_MESSAGE).toBe('No user with that username.');
		expect(await db.select().from(passwordReset)).toEqual([]);
	});

	it('allows a user without a password (the link sets one)', async () => {
		await makeUser('google_only');
		expect(
			(await createResetLink(db, { username: 'google_only', createdBy: adminId }, NOW)).ok
		).toBe(true);
	});
});

describe('getResetStatus', () => {
	it('is valid until 24 hours have passed, then expired', async () => {
		await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		expect(await getResetStatus(db, token, NOW)).toBe('valid');
		expect(
			await getResetStatus(db, token, new Date(NOW.getTime() + RESET_LINK_TTL_MS - 1000))
		).toBe('valid');
		expect(RESET_LINK_TTL_MS).toBe(24 * 60 * 60 * 1000);
	});

	it('a link expires after 24 hours', async () => {
		await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		const later = new Date(NOW.getTime() + 24 * 60 * 60 * 1000 + 1000);
		expect(await getResetStatus(db, token, later)).toBe('expired');
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, later, notPwned)).toEqual({
			ok: false,
			field: 'link',
			status: 'expired',
			message: 'This reset link has expired.'
		});
	});

	it('is notFound for unknown, malformed or raw-hash tokens', async () => {
		await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		expect(await getResetStatus(db, 'x'.repeat(43), NOW)).toBe('notFound');
		expect(await getResetStatus(db, 'not a token', NOW)).toBe('notFound');
		// Knowing the stored hash is not enough.
		expect(await getResetStatus(db, sha256hex(token), NOW)).toBe('notFound');
	});

	it('is notFound once the user is deleted', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		await db.delete(user).where(eq(user.id, userId));
		expect(await getResetStatus(db, token, NOW)).toBe('notFound');
	});

	it('stays valid when the admin who issued it is deleted', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		await db.delete(user).where(eq(user.id, adminId));
		expect(await getResetStatus(db, token, NOW)).toBe('valid');
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned)).toEqual({ ok: true });
		expect(await passwordMatches(userId, NEW_PASSWORD)).toBe(true);
	});
});

describe('useResetLink', () => {
	it('sets the new password', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned)).toEqual({ ok: true });
		expect(await passwordMatches(userId, NEW_PASSWORD)).toBe(true);
		expect(await passwordMatches(userId, 'old password 1234')).toBe(false);
		expect(await db.select().from(account).where(eq(account.userId, userId))).toHaveLength(1);
	});

	it('the new password works for signing in', async () => {
		await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned);
		const result = await auth.api.signInUsername({
			body: { username: 'alice', password: NEW_PASSWORD }
		});
		expect(result?.user.username).toBe('alice');
	});

	it('creates a credential account like Better Auth does for a user without a password', async () => {
		const userId = await makeUser('google_only');
		const token = await issue('google_only', adminId);
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned)).toEqual({ ok: true });
		const [row] = await db.select().from(account).where(eq(account.userId, userId));
		expect(row).toMatchObject({ providerId: 'credential', accountId: userId, userId });
		expect(await passwordMatches(userId, NEW_PASSWORD)).toBe(true);
	});

	it('a link works once', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned)).toEqual({ ok: true });
		expect(await getResetStatus(db, token, NOW)).toBe('used');
		const [row] = await db.select().from(passwordReset);
		expect(row.usedAt).toEqual(NOW);

		const again = await useResetLink(auth, db, token, 'another new password 1', NOW, notPwned);
		expect(again).toMatchObject({ ok: false, field: 'link', status: 'used' });
		expect(await passwordMatches(userId, NEW_PASSWORD)).toBe(true);
	});

	it('only one of two simultaneous uses wins', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		const token = await issue('alice', adminId);
		const results = await Promise.all([
			useResetLink(auth, db, token, 'first new password 1', NOW, notPwned),
			useResetLink(auth, db, token, 'second new password 1', NOW, notPwned)
		]);
		expect(results.filter((r) => r.ok)).toHaveLength(1);
		const first = await passwordMatches(userId, 'first new password 1');
		const second = await passwordMatches(userId, 'second new password 1');
		expect(first !== second).toBe(true);
	});

	it('using a link signs the user out everywhere', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		await addSession(userId);
		await addSession(userId);
		await addSession(adminId);
		const token = await issue('alice', adminId);
		await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned);
		expect(await db.select().from(session).where(eq(session.userId, userId))).toEqual([]);
		// Nobody else is signed out.
		expect(await db.select().from(session).where(eq(session.userId, adminId))).toHaveLength(1);
	});

	it('clears a sign-in lockout for the user', async () => {
		await makeUser('alice', 'old password 1234');
		await db.insert(signInFailure).values({ username: 'alice', createdAt: NOW });
		await db.insert(signInFailure).values({ username: 'bob', createdAt: NOW });
		const token = await issue('alice', adminId);
		await useResetLink(auth, db, token, NEW_PASSWORD, NOW, notPwned);
		expect((await db.select().from(signInFailure)).map((r) => r.username)).toEqual(['bob']);
	});

	it('the new password must pass the policy', async () => {
		const userId = await makeUser('alice_long', 'old password 1234');
		await addSession(userId);
		const token = await issue('alice_long', adminId);

		expect(await useResetLink(auth, db, token, 'Alice_Long', NOW, notPwned)).toEqual({
			ok: false,
			field: 'newPassword',
			message: PASSWORD_MESSAGES.sameAsUsername
		});
		expect(await useResetLink(auth, db, token, 'short', NOW, notPwned)).toEqual({
			ok: false,
			field: 'newPassword',
			message: PASSWORD_MESSAGES.tooShort
		});
		const isPwned = vi.fn(async () => true);
		expect(await useResetLink(auth, db, token, NEW_PASSWORD, NOW, isPwned)).toEqual({
			ok: false,
			field: 'newPassword',
			message: PASSWORD_MESSAGES.breached
		});
		expect(isPwned).toHaveBeenCalledWith(NEW_PASSWORD);

		// A rejected password leaves the link, the password and the sessions alone.
		expect(await getResetStatus(db, token, NOW)).toBe('valid');
		expect(await passwordMatches(userId, 'old password 1234')).toBe(true);
		expect(await db.select().from(session).where(eq(session.userId, userId))).toHaveLength(1);
	});

	it('refuses an unknown token without touching anything', async () => {
		const userId = await makeUser('alice', 'old password 1234');
		await addSession(userId);
		expect(await useResetLink(auth, db, 'x'.repeat(43), NEW_PASSWORD, NOW, notPwned)).toMatchObject(
			{ ok: false, field: 'link', status: 'notFound' }
		);
		expect(await passwordMatches(userId, 'old password 1234')).toBe(true);
		expect(await db.select().from(session)).toHaveLength(1);
	});
});
