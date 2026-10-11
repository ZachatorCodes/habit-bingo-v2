import { APIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';
import type { Db } from '#lib/server/db/client.ts';
import { account, user } from '#lib/server/db/schema.ts';
import type { Auth } from './create-auth.ts';
import { clearFailures, releaseAttempt, reserveAttempt } from './sign-in-throttle.ts';

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
	// Reserved before the slow password check, so concurrent attempts cannot slip past the lock.
	// The reserved row stands as the failure unless the sign-in succeeds.
	const attempt = await reserveAttempt(db, input.username, now);
	if (attempt === null) return { ok: false, message: LOCKED_OUT_MESSAGE };

	try {
		if (await existsWithoutPassword(db, input.username)) {
			// Better Auth rejects these instantly, while unknown usernames and wrong passwords cost a
			// scrypt hash. Spend the same hash so the timing does not reveal the account.
			await (await auth.$context).password.hash(input.password);
			return { ok: false, message: WRONG_CREDENTIALS_MESSAGE };
		}
		await auth.api.signInUsername({
			body: { username: input.username, password: input.password },
			headers
		});
	} catch (error) {
		// Every Better Auth rejection (unknown user, wrong password, malformed username) looks the
		// same. Anything else, like a database outage, is a real error and not a failed attempt.
		if (!(error instanceof APIError)) {
			await releaseAttempt(db, attempt).catch(() => {});
			throw error;
		}
		return { ok: false, message: WRONG_CREDENTIALS_MESSAGE };
	}
	await clearFailures(db, input.username);
	return { ok: true };
}

/** Whether an account has this username but no password (e.g. it only signs in with Google). */
async function existsWithoutPassword(db: Db, username: string): Promise<boolean> {
	const [row] = await db
		.select({ credentialId: account.id })
		.from(user)
		.leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, 'credential')))
		.where(eq(user.username, username.toLowerCase()))
		.limit(1);
	return row !== undefined && row.credentialId === null;
}

/** Where signed-in users land by default. */
export const DEFAULT_SIGNED_IN_PATH = '/today';

/**
 * The `?next=` path to return to after sign-in, or `/today`. Only same-site paths: they must start
 * with a single `/`, contain no backslash (browsers read `/\host` as `//host`), and still point at
 * our own origin once parsed (browsers strip tabs, so `/\t/host` would otherwise escape). The
 * same rules apply again to the normalized result, because dot segments can turn a safe-looking
 * path into a protocol-relative one (`/..//host` normalizes to `//host`).
 */
export function safeNextPath(next: string | null | undefined): string {
	const unsafe = (path: string) =>
		!path.startsWith('/') || path.startsWith('//') || path.includes('\\');
	if (!next || unsafe(next)) return DEFAULT_SIGNED_IN_PATH;
	const base = 'http://habit-bingo.invalid';
	const url = new URL(next, base);
	if (url.origin !== base) return DEFAULT_SIGNED_IN_PATH;
	const path = url.pathname + url.search + url.hash;
	return unsafe(path) ? DEFAULT_SIGNED_IN_PATH : path;
}
