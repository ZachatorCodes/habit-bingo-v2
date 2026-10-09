import { describe, expect, it } from 'vitest';
import { checkHealth } from './health';
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
