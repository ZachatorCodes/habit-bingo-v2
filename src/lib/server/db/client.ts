import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

/** The database handle every service takes. Neon in production, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(url: string): Db {
	return drizzle(new Pool({ connectionString: url }), { schema });
}

let cached: Db | undefined;

/** Lazily connects on first use; returns null when no database is configured. */
export function getDb(): Db | null {
	if (!DATABASE_URL) return null;
	cached ??= createDb(DATABASE_URL);
	return cached;
}
