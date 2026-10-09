import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/client.ts';
import { checkHealth } from '#lib/server/health.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const health = await checkHealth(getDb());
	return json(health, {
		status: health.status === 'ok' ? 200 : 503,
		headers: { 'cache-control': 'no-store' }
	});
};
