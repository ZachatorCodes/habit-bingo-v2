import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const DB_PORT = 55432;
const APP_PORT = 4173;
const DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`;
const BETTER_AUTH_SECRET = 'e2e-test-secret-e2e-test-secret-e2e-test-secret!';

const db = await PGlite.create();
await migrate(drizzle(db), { migrationsFolder: './drizzle' });
// Task 4 adds an optional seed hook here, before the server accepts traffic.

const socketServer = new PGLiteSocketServer({
	db,
	host: '127.0.0.1',
	port: DB_PORT,
	maxConnections: 10
});
await socketServer.start();

const child = spawn('npx', ['vite', 'preview', '--port', String(APP_PORT)], {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, DATABASE_URL, BETTER_AUTH_SECRET }
});

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
