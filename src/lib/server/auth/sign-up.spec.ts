import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { invite, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import type { Auth } from './create-auth.ts';
import { createInvite } from './invites.ts';
import { PASSWORD_MESSAGES } from './password-policy.ts';
import { signUpWithPassword } from './sign-up.ts';
import { createTestAuth } from './test-auth.ts';

const PASSWORD = 'correct horse battery';

let db: Db;
let auth: Auth;
let code: string;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db);
	const inviterId = crypto.randomUUID();
	await db
		.insert(user)
		.values({ id: inviterId, name: 'Inviter', email: `${inviterId}@users.invalid` });
	({ code } = await createInvite(
		db,
		{ createdBy: inviterId, expiresInDays: 7, maxUses: 10 },
		new Date()
	));
});

function withInvite(inviteCode: string | null = code) {
	return new Headers(inviteCode === null ? {} : { cookie: `hb_invite=${inviteCode}` });
}

function signUp(
	input: Partial<{ username: string; password: string; name: string }> = {},
	headers = withInvite()
) {
	return signUpWithPassword(
		auth,
		{ username: 'Zach_S', password: PASSWORD, name: 'Zach', ...input },
		headers
	);
}

async function usesOfInvite() {
	const [row] = await db.select().from(invite).where(eq(invite.code, code));
	return row.uses;
}

describe('signUpWithPassword', () => {
	it('creates the user with a placeholder email and the typed username casing', async () => {
		expect(await signUp()).toEqual({ ok: true });
		const [row] = await db.select().from(user).where(eq(user.username, 'zach_s'));
		expect(row.displayUsername).toBe('Zach_S');
		expect(row.name).toBe('Zach');
		expect(row.email).toMatch(/^[0-9a-f-]{36}@users\.invalid$/);
	});

	it('reports a taken username beside the username field', async () => {
		await signUp();
		expect(await signUp({ username: 'zach_s' })).toEqual({
			ok: false,
			field: 'username',
			message: 'That username is taken.'
		});
	});

	it.each(['ab', 'a'.repeat(21), 'has space', 'dash-y'])(
		'reports an invalid username %j beside the username field',
		async (username) => {
			expect(await signUp({ username })).toEqual({
				ok: false,
				field: 'username',
				message: 'Use 3–20 letters, numbers or underscores.'
			});
		}
	);

	it('reports password policy problems beside the password field', async () => {
		expect(await signUp({ password: 'short' })).toEqual({
			ok: false,
			field: 'password',
			message: PASSWORD_MESSAGES.tooShort
		});
		expect(await signUp({ username: 'samesame12', password: 'SameSame12' })).toEqual({
			ok: false,
			field: 'password',
			message: PASSWORD_MESSAGES.sameAsUsername
		});
	});

	it('reports a breached password beside the password field', async () => {
		auth = createTestAuth(db, { isPwned: async () => true });
		expect(await signUp()).toEqual({
			ok: false,
			field: 'password',
			message: PASSWORD_MESSAGES.breached
		});
	});

	it('reports a missing or dead invite as a form error', async () => {
		const expected = { ok: false, field: 'form', message: 'This invite is no longer valid.' };
		expect(await signUp({}, withInvite(null))).toEqual(expected);
		expect(await signUp({}, withInvite('nope'))).toEqual(expected);
	});

	it('does not use up the invite when sign-up fails (Review Focus 2)', async () => {
		await signUp();
		expect(await usesOfInvite()).toBe(1);
		await signUp({ username: 'zach_s' });
		await signUp({ username: 'other', password: 'short' });
		await signUp({ username: 'bad name' });
		expect(await usesOfInvite()).toBe(1);
	});
});
