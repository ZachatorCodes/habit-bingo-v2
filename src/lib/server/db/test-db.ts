import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from './client';
import * as schema from './schema';

let template: Promise<PGlite> | undefined;

/** One migrated database per test module; every test gets its own clone of it. */
function migratedTemplate(): Promise<PGlite> {
	template ??= (async () => {
		const pg = new PGlite();
		await migrate(drizzle(pg, { schema }), { migrationsFolder: 'drizzle' });
		return pg;
	})();
	return template;
}

/** A fresh in-memory Postgres with all migrations applied. */
export async function createTestDb(): Promise<Db> {
	const pg = (await (await migratedTemplate()).clone()) as PGlite;
	return drizzle(pg, { schema });
}
