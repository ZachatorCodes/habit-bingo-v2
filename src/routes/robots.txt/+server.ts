import { publicCache } from '#lib/server/cache.ts';
import { robotsTxt } from '#lib/server/seo.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, setHeaders }) => {
	publicCache(setHeaders);
	return new Response(robotsTxt(url.origin), { headers: { 'content-type': 'text/plain' } });
};
