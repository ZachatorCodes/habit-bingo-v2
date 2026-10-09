import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

/** The database handle every service takes. Postgres via node-postgres in production and E2E, PGlite in unit tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(url: string): Db {
	const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000, max: 5 });
	// An idle pooled client can fail when Neon suspends compute or drops the socket.
	// Unhandled, that 'error' event would crash the whole function instance.
	pool.on('error', (error: Error) =>
		console.error(JSON.stringify({ level: 'error', source: 'db-pool', message: error.message }))
	);
	return drizzle(pool, { schema });
}

let cached: Db | undefined;

/** Lazily connects on first use; returns null when no database is configured. */
export function getDb(): Db | null {
	if (!DATABASE_URL) return null;
	cached ??= createDb(DATABASE_URL);
	return cached;
}
