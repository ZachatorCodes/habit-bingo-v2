import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '#lib/server/db/schema.ts';
import { seedE2E } from './e2e-seed.ts';

const DB_PORT = 55432;
const APP_PORT = 4173;
const DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`;
const BETTER_AUTH_SECRET = 'e2e-test-secret-e2e-test-secret-e2e-test-secret!';

const db = await PGlite.create();
const orm = drizzle(db, { schema });
await migrate(orm, { migrationsFolder: './drizzle' });
// Seed before the server accepts traffic.
await seedE2E(orm, BETTER_AUTH_SECRET, `http://localhost:${APP_PORT}`);

const socketServer = new PGLiteSocketServer({
	db,
	host: '127.0.0.1',
	port: DB_PORT,
	maxConnections: 10
});
await socketServer.start();

// Spawn vite directly (no npx, no shell) so child.kill() reaches the real server process.
const child = spawn(
	process.execPath,
	['node_modules/vite/bin/vite.js', 'preview', '--port', String(APP_PORT)],
	{
		stdio: 'inherit',
		// Every E2E test comes from 127.0.0.1, so the per-IP auth limits are raised here (and only
		// here) to keep the suite from tripping them. Production leaves the multiplier unset (1).
		env: { ...process.env, DATABASE_URL, BETTER_AUTH_SECRET, IP_LIMIT_MULTIPLIER: '1000' }
	}
);

let stopping = false;
async function stop(code: number) {
	if (stopping) return;
	stopping = true;
	child.kill();
	await socketServer.stop().catch(() => {});
	await db.close().catch(() => {});
	process.exit(code);
}

process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));
child.on('exit', (code) => void stop(code ?? 0));
