import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { signInFailure } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { clearFailures, isLockedOut, recordFailure, reserveAttempt } from './sign-in-throttle.ts';

const MINUTE = 60_000;
const start = new Date('2026-10-11T12:00:00Z');

let db: Db;

beforeEach(async () => {
	db = await createTestDb();
});

async function fail(username: string, times: number, at = start) {
	for (let i = 0; i < times; i++) await recordFailure(db, username, at);
}

describe('sign-in throttle', () => {
	it('allows four failures', async () => {
		await fail('zach', 4);
		expect(await isLockedOut(db, 'zach', start)).toBe(false);
	});

	it('locks a username after 5 failures in 15 minutes and unlocks after', async () => {
		await fail('zach', 5);
		expect(await isLockedOut(db, 'zach', start)).toBe(true);
		expect(await isLockedOut(db, 'zach', new Date(start.getTime() + 15 * MINUTE - 1000))).toBe(
			true
		);
		expect(await isLockedOut(db, 'zach', new Date(start.getTime() + 15 * MINUTE + 1000))).toBe(
			false
		);
	});

	it('only counts failures inside the window', async () => {
		await fail('zach', 3, new Date(start.getTime() - 20 * MINUTE));
		await fail('zach', 2);
		expect(await isLockedOut(db, 'zach', start)).toBe(false);
	});

	it('treats usernames case-insensitively and stores them lowercased', async () => {
		await fail('Zach', 3);
		await fail('ZACH', 2);
		expect(await isLockedOut(db, 'zach', start)).toBe(true);
		const rows = await db.select().from(signInFailure);
		expect(new Set(rows.map((row) => row.username))).toEqual(new Set(['zach']));
	});

	it('keeps usernames separate', async () => {
		await fail('zach', 5);
		expect(await isLockedOut(db, 'other', start)).toBe(false);
	});

	it('clears a username’s failures', async () => {
		await fail('zach', 5);
		await fail('other', 1);
		await clearFailures(db, 'ZACH');
		expect(await isLockedOut(db, 'zach', start)).toBe(false);
		expect(await db.select().from(signInFailure)).toHaveLength(1);
	});

	it('deletes failures older than a day, for every username, when an attempt is reserved', async () => {
		const DAY = 24 * 60 * MINUTE;
		await fail('old', 1, new Date(start.getTime() - DAY - MINUTE));
		await fail('recent', 1, new Date(start.getTime() - DAY + MINUTE));
		await reserveAttempt(db, 'zach', start);
		const rows = await db.select().from(signInFailure);
		expect(rows.map((row) => row.username).sort()).toEqual(['recent', 'zach']);
	});
});
