import { describe, expect, it } from 'vitest';
import { cacheFor, checkHealth } from './health';
import { createTestDb } from './db/test-db';

describe('checkHealth', () => {
	it('is ok when the database answers', async () => {
		expect(await checkHealth(await createTestDb())).toEqual({ status: 'ok', db: 'ok' });
	});

	it('is degraded when no database is configured', async () => {
		expect(await checkHealth(null)).toEqual({ status: 'degraded', db: 'unconfigured' });
	});

	it('is degraded when the query fails', async () => {
		const broken = { execute: () => Promise.reject(new Error('boom')) } as never;
		expect(await checkHealth(broken)).toEqual({ status: 'degraded', db: 'down' });
	});
});

describe('cacheFor', () => {
	it('reuses the result within the time window, so polling does not keep the database awake', async () => {
		let now = 0;
		let calls = 0;
		const check = cacheFor(
			30_000,
			async () => ++calls,
			() => now
		);
		expect(await check()).toBe(1);
		now = 29_999;
		expect(await check()).toBe(1);
		now = 30_000;
		expect(await check()).toBe(2);
	});

	it('shares one in-flight check between concurrent callers', async () => {
		let calls = 0;
		const check = cacheFor(
			30_000,
			async () => ++calls,
			() => 0
		);
		expect(await Promise.all([check(), check()])).toEqual([1, 1]);
	});
});
