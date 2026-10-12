import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, onTestFinished } from 'vitest';
import type { Db } from './client';
import * as schema from './schema';

let template: Promise<PGlite> | undefined;
/** Clones made outside a test (e.g. in `beforeAll`), closed with the module. */
const moduleClones = new Set<PGlite>();

/** One migrated database per test module; every test gets its own clone of it. */
function migratedTemplate(): Promise<PGlite> {
	template ??= (async () => {
		const pg = new PGlite();
		await migrate(drizzle(pg, { schema }), { migrationsFolder: 'drizzle' });
		return pg;
	})();
	return template;
}

/**
 * Each PGlite instance holds its own WASM heap (tens of MB) that garbage collection is slow to
 * reclaim, so databases are closed explicitly: a clone made in a test or `beforeEach` when that
 * test finishes, anything else (and the template) when the test module finishes. Without this a
 * worker running a large spec file held gigabytes and CI runners were killed.
 */
afterAll(async () => {
	const open = [...moduleClones];
	moduleClones.clear();
	const pending = template;
	template = undefined;
	await Promise.all(open.map((pg) => pg.close().catch(() => {})));
	if (pending) await (await pending).close().catch(() => {});
});

/** A fresh in-memory Postgres with all migrations applied. */
export async function createTestDb(): Promise<Db> {
	const pg = (await (await migratedTemplate()).clone()) as PGlite;
	try {
		onTestFinished(() => pg.close().catch(() => {}));
	} catch {
		// Not inside a test (e.g. `beforeAll`): keep it open until the module finishes.
		moduleClones.add(pg);
	}
	return drizzle(pg, { schema });
}
