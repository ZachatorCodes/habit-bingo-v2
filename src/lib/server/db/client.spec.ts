import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ DATABASE_URL: undefined }));

describe('getDb', () => {
	it('returns null instead of throwing when DATABASE_URL is unset', async () => {
		const { getDb } = await import('./client');
		expect(getDb()).toBeNull();
	});
});
