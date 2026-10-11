import { APIError } from 'better-auth/api';
import type { Db } from '#lib/server/db/client.ts';
import type { Auth } from './create-auth.ts';
import { clearFailures, isLockedOut, recordFailure } from './sign-in-throttle.ts';

export const WRONG_CREDENTIALS_MESSAGE = 'Wrong username or password.';
export const LOCKED_OUT_MESSAGE = 'Too many attempts. Try again in a few minutes.';

export type SignInResult = { ok: true } | { ok: false; message: string };

/**
 * Signs in with a username and password (Better Auth sets the session cookie on the current
 * request). Unknown usernames are treated exactly like wrong passwords, lockout included, so
 * neither the message nor the lock reveals whether an account exists.
 */
export async function signInWithPassword(
	auth: Auth,
	db: Db,
	input: { username: string; password: string },
	headers: Headers,
	now: Date
): Promise<SignInResult> {
	if (await isLockedOut(db, input.username, now)) {
		return { ok: false, message: LOCKED_OUT_MESSAGE };
	}
	try {
		await auth.api.signInUsername({
			body: { username: input.username, password: input.password },
			headers
		});
	} catch (error) {
		// Every Better Auth rejection (unknown user, wrong password, malformed username, no password
		// on the account) looks the same. Anything else, like a database outage, is a real error.
		if (!(error instanceof APIError)) throw error;
		await recordFailure(db, input.username, now);
		return { ok: false, message: WRONG_CREDENTIALS_MESSAGE };
	}
	await clearFailures(db, input.username);
	return { ok: true };
}

/** Where signed-in users land by default. */
export const DEFAULT_SIGNED_IN_PATH = '/today';

/**
 * The `?next=` path to return to after sign-in, or `/today`. Only same-site paths: they must start
 * with a single `/`, contain no backslash (browsers read `/\host` as `//host`), and still point at
 * our own origin once parsed (browsers strip tabs, so `/\t/host` would otherwise escape).
 */
export function safeNextPath(next: string | null | undefined): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
		return DEFAULT_SIGNED_IN_PATH;
	}
	const base = 'http://habit-bingo.invalid';
	const url = new URL(next, base);
	if (url.origin !== base) return DEFAULT_SIGNED_IN_PATH;
	return url.pathname + url.search + url.hash;
}
