import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { toAppError } from '#lib/server/errors.ts';
import { SECURITY_HEADERS } from '#lib/server/security-headers.ts';

export const handle: Handle = async ({ event, resolve }) => {
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

function setSecurityHeaders(headers: Headers): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(name, value);
	}
}

export const handleError: HandleServerError = ({ kind, error, event }) => {
	// App errors, validation errors and SvelteKit's own (like 404) already carry safe messages.
	if (kind !== 'unknown') return;
	return toAppError(error, event.url.pathname, (entry) => console.error(JSON.stringify(entry)));
};
