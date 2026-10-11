import {
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	BOOTSTRAP_INVITE_CODE,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET
} from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { getDb } from '#lib/server/db/client.ts';
import { createAuth, type Auth } from './create-auth.ts';
import { isPwnedPassword } from './pwned.ts';

export { createAuth, type Auth, type AuthOptions } from './create-auth.ts';

let cached: Auth | undefined;

/** The current request event, or undefined outside a request (tests, scripts). */
function currentRequestEvent() {
	try {
		return getRequestEvent();
	} catch {
		return undefined;
	}
}

/** The app's auth instance, or null when the database or secret is not configured. */
export function tryGetAuth(): Auth | null {
	if (cached) return cached;
	const db = getDb();
	if (!db || !BETTER_AUTH_SECRET) return null;
	cached = createAuth(db, {
		secret: BETTER_AUTH_SECRET,
		baseURL: BETTER_AUTH_URL,
		google:
			GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
				? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
				: undefined,
		isPwned: isPwnedPassword,
		bootstrapInviteCode: BOOTSTRAP_INVITE_CODE,
		getRequestEvent: currentRequestEvent
	});
	return cached;
}

/** The app's auth instance. Throws when DATABASE_URL or BETTER_AUTH_SECRET is missing. */
export function getAuth(): Auth {
	const auth = tryGetAuth();
	if (auth) return auth;
	const missing = [!getDb() && 'DATABASE_URL', !BETTER_AUTH_SECRET && 'BETTER_AUTH_SECRET'].filter(
		Boolean
	);
	throw new Error(`Auth is not configured: set ${missing.join(' and ')}.`);
}
