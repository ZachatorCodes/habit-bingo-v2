import { describe, expect, it, vi } from 'vitest';
import { getAuth, tryGetAuth } from './index.ts';

vi.mock('$app/env/private', () => ({
	DATABASE_URL: undefined,
	BETTER_AUTH_SECRET: undefined,
	BETTER_AUTH_URL: undefined,
	GOOGLE_CLIENT_ID: undefined,
	GOOGLE_CLIENT_SECRET: undefined,
	BOOTSTRAP_INVITE_CODE: undefined
}));

describe('getAuth', () => {
	it('names the missing variables instead of failing obscurely', () => {
		expect(() => getAuth()).toThrow(
			'Auth is not configured: set DATABASE_URL and BETTER_AUTH_SECRET.'
		);
	});

	it('tryGetAuth returns null so requests still work without auth', () => {
		expect(tryGetAuth()).toBeNull();
	});
});
