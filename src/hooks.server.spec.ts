import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle } from './hooks.server';
import { SECURITY_HEADERS } from '#lib/server/security-headers.ts';

const event = {} as RequestEvent;

describe('handle', () => {
	it('adds the security headers to a normal response', async () => {
		const response = await handle({ event, resolve: async () => new Response('ok') });
		expect(Object.fromEntries(response.headers)).toMatchObject(lowercase(SECURITY_HEADERS));
	});

	it('adds the security headers to a response with immutable headers, like Response.redirect', async () => {
		const response = await handle({
			event,
			resolve: async () => Response.redirect('https://example.com/next', 302)
		});
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('https://example.com/next');
		expect(Object.fromEntries(response.headers)).toMatchObject(lowercase(SECURITY_HEADERS));
	});
});

function lowercase(headers: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
	);
}
