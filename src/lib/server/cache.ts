/** Lets Vercel's CDN cache a public page for an hour while browsers always revalidate. */
export function publicCache(setHeaders: (headers: Record<string, string>) => void): void {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600' });
}
