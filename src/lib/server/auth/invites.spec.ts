import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { invite, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { consumeInvite, createInvite, getInviteStatus } from './invites.ts';

const NOW = new Date('2026-10-11T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

let db: Db;
let adminId: string;

beforeEach(async () => {
	db = await createTestDb();
	adminId = crypto.randomUUID();
	await db.insert(user).values({
		id: adminId,
		name: 'Admin',
		email: `${adminId}@users.invalid`,
		username: 'admin'
	});
});

describe('invites', () => {
	it('creates a 10-byte base64url code with the given limits', async () => {
		const { code } = await createInvite(
			db,
			{ createdBy: adminId, expiresInDays: 7, maxUses: 3, groupId: 'g1' },
			NOW
		);
		expect(code).toMatch(/^[A-Za-z0-9_-]{14}$/);
		const [row] = await db.select().from(invite).where(eq(invite.code, code));
		expect(row).toMatchObject({
			createdBy: adminId,
			groupId: 'g1',
			maxUses: 3,
			uses: 0,
			expiresAt: new Date(NOW.getTime() + 7 * DAY)
		});
	});

	it('a new invite is valid until it expires', async () => {
		const { code } = await createInvite(
			db,
			{ createdBy: adminId, expiresInDays: 1, maxUses: 1 },
			NOW
		);
		expect(await getInviteStatus(db, code, NOW)).toBe('valid');
		expect(await getInviteStatus(db, code, new Date(NOW.getTime() + DAY - 1))).toBe('valid');
		expect(await getInviteStatus(db, code, new Date(NOW.getTime() + DAY))).toBe('expired');
		expect(await consumeInvite(db, code, new Date(NOW.getTime() + DAY))).toBe(false);
	});

	it('consumes uses atomically and reports usedUp', async () => {
		const { code } = await createInvite(
			db,
			{ createdBy: adminId, expiresInDays: 7, maxUses: 1 },
			NOW
		);
		expect(await consumeInvite(db, code, NOW)).toBe(true);
		expect(await consumeInvite(db, code, NOW)).toBe(false);
		expect(await getInviteStatus(db, code, NOW)).toBe('usedUp');
		const [row] = await db.select().from(invite).where(eq(invite.code, code));
		expect(row.uses).toBe(1);
	});

	it('reports notFound for unknown codes', async () => {
		expect(await getInviteStatus(db, 'nope', NOW)).toBe('notFound');
		expect(await consumeInvite(db, 'nope', NOW)).toBe(false);
	});

	it('two concurrent consumes of a one-use invite let exactly one through', async () => {
		const { code } = await createInvite(
			db,
			{ createdBy: adminId, expiresInDays: 7, maxUses: 1 },
			NOW
		);
		const results = await Promise.all([consumeInvite(db, code, NOW), consumeInvite(db, code, NOW)]);
		expect(results.sort()).toEqual([false, true]);
	});
});
