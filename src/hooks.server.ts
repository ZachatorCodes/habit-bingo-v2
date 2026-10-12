import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { tryGetAuth } from '#lib/server/auth/index.ts';
import { toAppError } from '#lib/server/errors.ts';
import { SECURITY_HEADERS } from '#lib/server/security-headers.ts';

/** Loads the session into `locals` and serves Better Auth's routes under /api/auth. */
export const authHandle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	// Without a database or secret the app still serves public pages; nobody is signed in.
	const auth = building ? null : tryGetAuth();
	if (!auth) return resolve(event);

	try {
		const result = await auth.api.getSession({ headers: event.request.headers });
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
		}
	} catch (error) {
		// A database outage must not take down public pages or /api/health; treat it as signed out.
		console.error(
			JSON.stringify({
				level: 'error',
				source: 'auth-session',
				message: error instanceof Error ? error.message : String(error)
			})
		);
	}
	return svelteKitHandler({ auth, event, resolve, building });
};

export const securityHeadersHandle: Handle = async ({ event, resolve }) => {
	let response = await resolve(event);
	try {
		setSecurityHeaders(response.headers);
	} catch {
		// Some responses (Response.redirect, proxied fetch) have immutable headers; copy them first.
		response = new Response(response.body, response);
		setSecurityHeaders(response.headers);
	}
	return response;
};

// Security headers wrap auth so Better Auth's own /api/auth responses get them too (spec §5.4).
export const handle = sequence(securityHeadersHandle, authHandle);

/** Only `no-referrer` may replace the default, for pages with a secret in their URL (/reset). */
const STRICTER_REFERRER_POLICY = 'no-referrer';

function setSecurityHeaders(headers: Headers): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (
			name.toLowerCase() === 'referrer-policy' &&
			headers.get(name) === STRICTER_REFERRER_POLICY
		) {
			continue;
		}
		headers.set(name, value);
	}
}

export const handleError: HandleServerError = ({ kind, error, event }) => {
	// App errors, validation errors and SvelteKit's own (like 404) already carry safe messages.
	if (kind !== 'unknown') return;
	return toAppError(error, loggablePath(event.url.pathname), (entry) =>
		console.error(JSON.stringify(entry))
	);
};

/** The path for logs, with bearer secrets (reset-link tokens) taken out. */
function loggablePath(pathname: string): string {
	return pathname.replace(/^\/reset\/[^/]+/, '/reset/[token]');
}
