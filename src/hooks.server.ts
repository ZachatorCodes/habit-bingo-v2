import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { toAppError } from '#lib/server/errors.ts';
import { SECURITY_HEADERS } from '#lib/server/security-headers.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(name, value);
	}
	return response;
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	// App errors, validation errors and SvelteKit's own (like 404) already carry safe messages.
	if (kind !== 'unknown') return;
	return toAppError(error, event.url.pathname, (entry) => console.error(JSON.stringify(entry)));
};
