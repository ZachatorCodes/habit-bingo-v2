import { sql } from 'drizzle-orm';
import type { Db } from './db/client';

export type Health = { status: 'ok' | 'degraded'; db: 'ok' | 'down' | 'unconfigured' };

export async function checkHealth(db: Db | null): Promise<Health> {
	if (!db) return { status: 'degraded', db: 'unconfigured' };
	try {
		await db.execute(sql`select 1`);
		return { status: 'ok', db: 'ok' };
	} catch {
		return { status: 'degraded', db: 'down' };
	}
}
