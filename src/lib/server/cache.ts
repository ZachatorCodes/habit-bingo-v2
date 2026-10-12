/** Lets Vercel's CDN cache a public page for an hour while browsers always revalidate. */
export function publicCache(setHeaders: (headers: Record<string, string>) => void): void {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' });
}

/**
 * Routes that call `publicCache`. Their responses are shared through the CDN, so the auth hook
 * skips the session lookup on them (a lookup can refresh the session and set a cookie). Keep in
 * sync with the `publicCache` callers; `publicCacheCookieHandle` strips any cookie that slips by.
 */
export const PUBLIC_CACHED_ROUTES: ReadonlySet<string> = new Set([
	'/',
	'/privacy',
	'/terms',
	'/robots.txt',
	'/sitemap.xml'
]);

/** Whether a shared cache (a CDN) may store this response. */
export function isSharedCacheable(headers: Headers): boolean {
	return /(^|,)\s*public\s*(,|$)/i.test(headers.get('cache-control') ?? '');
}
