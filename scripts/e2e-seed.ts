// Seeds the E2E database before the server starts: two onboarded users and invites in every state.
// Nothing here ships in the production build (no test-only routes).
import { eq } from 'drizzle-orm';
import { createAuth } from '#lib/server/auth/create-auth.ts';
import type { Db } from '#lib/server/db/client.ts';
import { invite, user } from '#lib/server/db/schema.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export const E2E_USERS = {
	admin: { username: 'e2e_admin', password: 'e2e admin password 1', name: 'E2E Admin' },
	member: { username: 'e2e_member', password: 'e2e member password 1', name: 'E2E Member' }
} as const;

export async function seedE2E(db: Db, secret: string, baseURL: string): Promise<void> {
	const now = Date.now();
	await db.insert(invite).values([
		{ code: 'E2E-OPEN', maxUses: 1000, expiresAt: new Date(now + 30 * DAY_MS) },
		{ code: 'E2E-EXPIRED', maxUses: 1000, expiresAt: new Date(now - DAY_MS) },
		{ code: 'E2E-USED', maxUses: 1, uses: 1, expiresAt: new Date(now + 30 * DAY_MS) }
	]);

	// The same secret as the server, so these accounts can sign in there. No breach lookups.
	const auth = createAuth(db, { secret, baseURL, isPwned: async () => false });
	const headers = new Headers({ cookie: 'hb_invite=E2E-OPEN' });
	for (const [role, { username, password, name }] of Object.entries(E2E_USERS)) {
		const { user: created } = await auth.api.signUpEmail({
			body: { email: `${crypto.randomUUID()}@users.invalid`, password, name, username },
			headers
		});
		await db
			.update(user)
			.set({ onboardedAt: new Date(now), isAdmin: role === 'admin' })
			.where(eq(user.id, created.id));
	}
}
