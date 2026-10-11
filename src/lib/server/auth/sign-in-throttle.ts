import { and, count, eq, gt } from 'drizzle-orm';
import type { Db } from '#lib/server/db/client.ts';
import { signInFailure } from '#lib/server/db/schema.ts';

/** Failed sign-ins within the window that lock a username. */
export const MAX_FAILURES = 5;
/** How far back failures count, and so how long a lock lasts. */
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/** Failures are kept per lowercased username, whether or not an account has it. */
function key(username: string): string {
	return username.toLowerCase();
}

/** Whether the username has had too many failed sign-ins in the last 15 minutes. */
export async function isLockedOut(db: Db, username: string, now: Date): Promise<boolean> {
	const since = new Date(now.getTime() - LOCKOUT_WINDOW_MS);
	const [row] = await db
		.select({ failures: count() })
		.from(signInFailure)
		.where(and(eq(signInFailure.username, key(username)), gt(signInFailure.createdAt, since)));
	return row.failures >= MAX_FAILURES;
}

export async function recordFailure(db: Db, username: string, now: Date): Promise<void> {
	await db.insert(signInFailure).values({ username: key(username), createdAt: now });
}

export async function clearFailures(db: Db, username: string): Promise<void> {
	await db.delete(signInFailure).where(eq(signInFailure.username, key(username)));
}
