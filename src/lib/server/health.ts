import { sql } from 'drizzle-orm';
import type { Db } from './db/client';

export type Health = { status: 'ok' | 'degraded'; db: 'ok' | 'down' | 'unconfigured' };

/** Wraps `fn` so it runs at most once per `ttlMs`; callers in between share the last result. */
export function cacheFor<T>(
	ttlMs: number,
	fn: () => Promise<T>,
	now: () => number = Date.now
): () => Promise<T> {
	let cached: { at: number; result: Promise<T> } | undefined;
	return () => {
		if (!cached || now() - cached.at >= ttlMs) cached = { at: now(), result: fn() };
		return cached.result;
	};
}

export async function checkHealth(db: Db | null): Promise<Health> {
	if (!db) return { status: 'degraded', db: 'unconfigured' };
	try {
		await db.execute(sql`select 1`);
		return { status: 'ok', db: 'ok' };
	} catch {
		return { status: 'degraded', db: 'down' };
	}
}
