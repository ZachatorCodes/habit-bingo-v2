import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from './client';
import * as schema from './schema';

/** A fresh in-memory Postgres with all migrations applied. */
export async function createTestDb(): Promise<Db> {
	const db = drizzle(new PGlite(), { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}
