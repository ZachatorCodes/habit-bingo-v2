/** Sent on every response (spec §5.4): by `hooks.server.ts` for rendered responses, and by the
 * matching `headers` block in vercel.json for static files, which Vercel serves without the hook.
 * The CSP header itself comes from Kit's `csp` config. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'X-Frame-Options': 'DENY',
	'Cross-Origin-Opener-Policy': 'same-origin'
};
