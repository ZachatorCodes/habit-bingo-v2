import type { Db } from '#lib/server/db/client.ts';
import { createAuth, type Auth, type AuthOptions } from './create-auth.ts';

export const TEST_AUTH_SECRET = 'unit-test-secret-unit-test-secret-unit-test!';

/** A Better Auth instance for unit tests: fixed secret, no breach lookups. */
export function createTestAuth(db: Db, overrides: Partial<AuthOptions> = {}): Auth {
	return createAuth(db, {
		secret: TEST_AUTH_SECRET,
		baseURL: 'http://localhost',
		isPwned: async () => false,
		...overrides
	});
}
