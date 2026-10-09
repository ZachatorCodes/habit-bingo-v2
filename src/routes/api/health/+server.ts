import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/client.ts';
import { cacheFor, checkHealth } from '#lib/server/health.ts';
import type { RequestHandler } from './$types';

// Public and unauthenticated: without a cache, frequent polling would keep Neon from sleeping.
const cachedHealth = cacheFor(30_000, () => checkHealth(getDb()));

export const GET: RequestHandler = async () => {
	const health = await cachedHealth();
	return json(health, {
		status: health.status === 'ok' ? 200 : 503,
		headers: { 'cache-control': 'no-store' }
	});
};
