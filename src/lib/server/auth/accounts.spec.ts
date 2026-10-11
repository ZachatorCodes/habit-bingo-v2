import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { AVATAR_EMOJI } from '#lib/profile.ts';
import type { Db } from '#lib/server/db/client.ts';
import { user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { completeOnboarding, validateProfileInput, validateSettingsInput } from './accounts.ts';

let db: Db;
const NOW = new Date('2026-10-10T12:00:00Z');
const base = {
	name: 'Zach',
	avatarEmoji: '🦊',
	timezone: 'Europe/London',
	weekStartsOn: 'sunday' as const
};

async function makeUser(username?: string | null) {
	const id = crypto.randomUUID();
	if (username === undefined) username = `u_${id.slice(0, 8)}`;
	await db.insert(user).values({
		id,
		name: 'Old',
		email: `${id}@users.invalid`,
		username,
		displayUsername: username
	});
	return id;
}

async function row(id: string) {
	const [r] = await db.select().from(user).where(eq(user.id, id));
	return r;
}

beforeEach(async () => {
	db = await createTestDb();
});

describe('completeOnboarding', () => {
	it('saves the profile and marks the user onboarded', async () => {
		const id = await makeUser();
		expect(await completeOnboarding(db, id, base, NOW)).toEqual({ ok: true });
		expect(await row(id)).toMatchObject({
			name: 'Zach',
			avatarEmoji: '🦊',
			timezone: 'Europe/London',
			weekStartsOn: 'sunday',
			onboardedAt: NOW,
			username: expect.stringMatching(/^u_/)
		});
	});

	it('accepts every avatar in the list and nothing else', async () => {
		for (const avatarEmoji of AVATAR_EMOJI) {
			const id = await makeUser();
			expect(await completeOnboarding(db, id, { ...base, avatarEmoji }, NOW)).toEqual({ ok: true });
		}
		const id = await makeUser();
		expect(await completeOnboarding(db, id, { ...base, avatarEmoji: '💩' }, NOW)).toMatchObject({
			ok: false,
			field: 'avatarEmoji'
		});
		expect((await row(id)).onboardedAt).toBeNull();
	});

	it('rejects unknown timezones', async () => {
		const id = await makeUser();
		expect(
			await completeOnboarding(db, id, { ...base, timezone: 'Mars/Olympus' }, NOW)
		).toMatchObject({ ok: false, field: 'timezone' });
		expect((await row(id)).onboardedAt).toBeNull();
	});

	it('rejects an unknown week start', async () => {
		const id = await makeUser();
		expect(
			await completeOnboarding(db, id, { ...base, weekStartsOn: 'friday' as never }, NOW)
		).toMatchObject({ ok: false, field: 'weekStartsOn' });
	});

	it('requires a username only for users who do not have one', async () => {
		const withName = await makeUser();
		expect((await completeOnboarding(db, withName, base, NOW)).ok).toBe(true);

		const without = await makeUser(null);
		expect(await completeOnboarding(db, without, base, NOW)).toMatchObject({
			ok: false,
			field: 'username',
			message: 'Use 3–20 letters, numbers or underscores.'
		});
		expect(await completeOnboarding(db, without, { ...base, username: 'a b' }, NOW)).toMatchObject({
			ok: false,
			field: 'username'
		});
		expect(
			await completeOnboarding(db, without, { ...base, username: 'Google_Zach' }, NOW)
		).toEqual({ ok: true });
		expect(await row(without)).toMatchObject({
			username: 'google_zach',
			displayUsername: 'Google_Zach'
		});
	});

	it('does not change the username of a user who has one', async () => {
		const id = await makeUser('keeper');
		await completeOnboarding(db, id, { ...base, username: 'other_name' }, NOW);
		expect((await row(id)).username).toBe('keeper');
	});

	it('reports a taken username case-insensitively', async () => {
		await makeUser('taken_name');
		const id = await makeUser(null);
		expect(await completeOnboarding(db, id, { ...base, username: 'Taken_Name' }, NOW)).toEqual({
			ok: false,
			field: 'username',
			message: 'That username is taken.'
		});
		expect((await row(id)).onboardedAt).toBeNull();
	});

	it('trims the display name and enforces 1–40 characters', async () => {
		const id = await makeUser();
		expect(await completeOnboarding(db, id, { ...base, name: '   ' }, NOW)).toMatchObject({
			ok: false,
			field: 'name'
		});
		expect(await completeOnboarding(db, id, { ...base, name: 'x'.repeat(41) }, NOW)).toMatchObject({
			ok: false,
			field: 'name'
		});
		expect(await completeOnboarding(db, id, { ...base, name: '  Zed  ' }, NOW)).toEqual({
			ok: true
		});
		expect((await row(id)).name).toBe('Zed');
		const id2 = await makeUser();
		await completeOnboarding(db, id2, { ...base, name: 'x'.repeat(40) }, NOW);
		expect((await row(id2)).name).toHaveLength(40);
	});
});

describe('validators', () => {
	it('validateProfileInput trims and checks the avatar', () => {
		expect(validateProfileInput({ name: ' A ', avatarEmoji: '🙂' })).toEqual({
			ok: true,
			name: 'A'
		});
		expect(validateProfileInput({ name: 'A', avatarEmoji: 'x' })).toMatchObject({
			ok: false,
			field: 'avatarEmoji'
		});
	});

	it('validateSettingsInput checks timezone and week start', () => {
		expect(validateSettingsInput({ timezone: 'UTC', weekStartsOn: 'monday' })).toEqual({
			ok: true,
			timezone: 'UTC',
			weekStartsOn: 'monday'
		});
		expect(validateSettingsInput({ timezone: 'Nope', weekStartsOn: 'monday' })).toMatchObject({
			ok: false,
			field: 'timezone'
		});
		expect(validateSettingsInput({ timezone: 'UTC', weekStartsOn: 'x' })).toMatchObject({
			ok: false,
			field: 'weekStartsOn'
		});
	});
});
