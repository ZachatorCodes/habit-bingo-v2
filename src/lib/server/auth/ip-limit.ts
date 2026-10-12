import { and, count, eq, gt, lt } from 'drizzle-orm';
import type { Db } from '#lib/server/db/client.ts';
import { authAttempt } from '#lib/server/db/schema.ts';

/**
 * Per-IP brute-force limits (spec §5.4). Better Auth's own rate limiter only runs inside its HTTP
 * router, and our form actions call `auth.api.*` directly, so these guard the actions instead.
 */
export type IpScope = 'signin' | 'signup' | 'reset';

/** Attempts allowed per client IP within the window, per scope. */
export const IP_LIMITS: Readonly<Record<IpScope, number>> = { signin: 30, signup: 10, reset: 10 };
export const IP_WINDOW_MS = 15 * 60 * 1000;
/** Attempts older than this are deleted. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export const TOO_MANY_ATTEMPTS_MESSAGE = 'Too many attempts. Try again in a few minutes.';

/**
 * Records an attempt from `ip` and returns whether it is within the limit (false: blocked). The
 * row is written before counting, so concurrent requests cannot all slip under the limit, and
 * blocked attempts count too. `multiplier` scales every limit; it is 1 except on the E2E server,
 * where every test shares one IP (see `IP_LIMIT_MULTIPLIER` in src/env.ts).
 */
export async function checkAndRecordIp(
	db: Db,
	scope: IpScope,
	ip: string,
	now: Date,
	multiplier = 1
): Promise<boolean> {
	const key = `${scope}:${ip}`;
	await db.insert(authAttempt).values({ key, createdAt: now });
	const since = new Date(now.getTime() - IP_WINDOW_MS);
	const [row] = await db
		.select({ attempts: count() })
		.from(authAttempt)
		.where(and(eq(authAttempt.key, key), gt(authAttempt.createdAt, since)));
	// Opportunistic cleanup, so the table stays small without a scheduled job.
	await db
		.delete(authAttempt)
		.where(lt(authAttempt.createdAt, new Date(now.getTime() - RETENTION_MS)));
	return row.attempts <= IP_LIMITS[scope] * multiplier;
}
