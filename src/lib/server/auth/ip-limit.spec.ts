import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { authAttempt } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { checkAndRecordIp, IP_LIMITS, IP_WINDOW_MS } from './ip-limit.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const start = new Date('2026-10-11T12:00:00Z');
const at = (ms: number) => new Date(start.getTime() + ms);

let db: Db;

beforeEach(async () => {
	db = await createTestDb();
});

/** Makes `times` attempts and returns how many were allowed. */
async function attempts(
	scope: 'signin' | 'signup' | 'reset',
	ip: string,
	times: number,
	now = start
) {
	let allowed = 0;
	for (let i = 0; i < times; i++) if (await checkAndRecordIp(db, scope, ip, now)) allowed++;
	return allowed;
}

describe('checkAndRecordIp', () => {
	it('has the spec limits per 15 minutes', () => {
		expect(IP_LIMITS).toEqual({ signin: 30, signup: 10, reset: 10 });
		expect(IP_WINDOW_MS).toBe(15 * MINUTE);
	});

	it.each([
		['signin', 30],
		['signup', 10],
		['reset', 10]
	] as const)('allows %s %i times from one IP, then blocks', async (scope, limit) => {
		expect(await attempts(scope, '203.0.113.9', limit)).toBe(limit);
		expect(await checkAndRecordIp(db, scope, '203.0.113.9', start)).toBe(false);
	});

	it('counts each scope and each IP separately', async () => {
		await attempts('signup', '203.0.113.9', 10);
		expect(await checkAndRecordIp(db, 'signup', '203.0.113.9', start)).toBe(false);
		expect(await checkAndRecordIp(db, 'reset', '203.0.113.9', start)).toBe(true);
		expect(await checkAndRecordIp(db, 'signin', '203.0.113.9', start)).toBe(true);
		expect(await checkAndRecordIp(db, 'signup', '198.51.100.7', start)).toBe(true);
	});

	it('records rows keyed by scope and IP', async () => {
		await checkAndRecordIp(db, 'reset', '2001:db8::1', start);
		const rows = await db.select().from(authAttempt);
		expect(rows.map((r) => r.key)).toEqual(['reset:2001:db8::1']);
	});

	it('only counts attempts inside the 15-minute window', async () => {
		await attempts('signup', '203.0.113.9', 10);
		expect(await checkAndRecordIp(db, 'signup', '203.0.113.9', at(15 * MINUTE - 1000))).toBe(false);
		// Every attempt above, the blocked ones included, has left the window.
		expect(await checkAndRecordIp(db, 'signup', '203.0.113.9', at(31 * MINUTE))).toBe(true);
	});

	it('scales the limits by a multiplier', async () => {
		expect(await attempts('signup', '203.0.113.9', 20)).toBe(10);
		for (let i = 0; i < 10; i++) await checkAndRecordIp(db, 'reset', '203.0.113.9', start, 3);
		expect(await checkAndRecordIp(db, 'reset', '203.0.113.9', start, 3)).toBe(true);
	});

	it('deletes attempts older than a day, for every key', async () => {
		await checkAndRecordIp(db, 'signin', '203.0.113.9', start);
		await checkAndRecordIp(db, 'reset', '198.51.100.7', at(DAY - MINUTE));
		await checkAndRecordIp(db, 'signup', '192.0.2.1', at(DAY + MINUTE));
		const keys = (await db.select().from(authAttempt)).map((r) => r.key).sort();
		expect(keys).toEqual(['reset:198.51.100.7', 'signup:192.0.2.1']);
	});
});
