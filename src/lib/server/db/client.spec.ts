import type { Pool } from '@neondatabase/serverless';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ DATABASE_URL: undefined }));

describe('getDb', () => {
	it('returns null instead of throwing when DATABASE_URL is unset', async () => {
		const { getDb } = await import('./client');
		expect(getDb()).toBeNull();
	});
});

describe('createDb', () => {
	const poolOf = async () => {
		const { createDb } = await import('./client');
		return (createDb('postgres://user:pass@localhost/db') as unknown as { $client: Pool }).$client;
	};

	it('handles idle-client errors so a dropped connection cannot crash the process', async () => {
		const pool = await poolOf();
		expect(pool.listenerCount('error')).toBeGreaterThan(0);
		expect(() => pool.emit('error', new Error('connection terminated'))).not.toThrow();
	});

	it('gives up connecting after 5 seconds so health checks answer instead of hanging', async () => {
		const pool = await poolOf();
		expect(pool.options.connectionTimeoutMillis).toBe(5000);
	});
});
