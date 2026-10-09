import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { account, session, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import type { Auth } from './create-auth.ts';
import { createTestAuth } from './test-auth.ts';

const PASSWORD = 'correct horse battery';

let db: Db;
let auth: Auth;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db);
});

function signUp(username: string, password = PASSWORD) {
	return auth.api.signUpEmail({
		body: { email: `${crypto.randomUUID()}@users.invalid`, password, name: 'Zach', username }
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
				} as never
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

	it('does not expose password sign-in over HTTP', async () => {
		const res = await auth.handler(
			new Request('http://localhost/api/auth/sign-in/username', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost' },
				body: '{}'
			})
		);
		expect(res.status).toBe(404);
		// Control: the handler itself is mounted and answering.
		expect((await auth.handler(new Request('http://localhost/api/auth/ok'))).status).toBe(200);
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
