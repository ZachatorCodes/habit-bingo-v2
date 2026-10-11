import { describe, expect, it, vi } from 'vitest';
import { createAuth } from './create-auth.ts';
import { tryGetAuth } from './index.ts';
import { isPwnedPassword } from './pwned.ts';

vi.mock('$app/env/private', () => ({
	DATABASE_URL: 'postgres://unused',
	BETTER_AUTH_SECRET: 'configured-secret-configured-secret-configured',
	BETTER_AUTH_URL: undefined,
	GOOGLE_CLIENT_ID: undefined,
	GOOGLE_CLIENT_SECRET: undefined,
	BOOTSTRAP_INVITE_CODE: 'bootstrap-from-env'
}));

vi.mock('#lib/server/db/client.ts', () => ({ getDb: () => ({ fake: 'db' }) }));

vi.mock('./create-auth.ts', () => ({ createAuth: vi.fn(() => ({ fake: 'auth' })) }));

describe('tryGetAuth with the environment configured', () => {
	it('builds auth with the real breach check and the bootstrap code', () => {
		expect(tryGetAuth()).toEqual({ fake: 'auth' });
		expect(createAuth).toHaveBeenCalledOnce();
		const [, options] = vi.mocked(createAuth).mock.calls[0];
		// Production must never skip the Have I Been Pwned lookup.
		expect(options.isPwned).toBe(isPwnedPassword);
		expect(options.bootstrapInviteCode).toBe('bootstrap-from-env');
	});
});
