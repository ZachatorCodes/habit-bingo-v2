import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { authHandle, securityHeadersHandle } from './hooks.server';
import { tryGetAuth } from '#lib/server/auth/index.ts';
import { SECURITY_HEADERS } from '#lib/server/security-headers.ts';

// Default: no database or secret, so auth cannot be built.
vi.mock('#lib/server/auth/index.ts', () => ({ tryGetAuth: vi.fn(() => null) }));

const event = {} as RequestEvent;

describe('securityHeadersHandle', () => {
	it('adds the security headers to a normal response', async () => {
		const response = await securityHeadersHandle({
			event,
			resolve: async () => new Response('ok')
		});
		expect(Object.fromEntries(response.headers)).toMatchObject(lowercase(SECURITY_HEADERS));
	});

	it('adds the security headers to a response with immutable headers, like Response.redirect', async () => {
		const response = await securityHeadersHandle({
			event,
			resolve: async () => Response.redirect('https://example.com/next', 302)
		});
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('https://example.com/next');
		expect(Object.fromEntries(response.headers)).toMatchObject(lowercase(SECURITY_HEADERS));
	});
});

describe('authHandle', () => {
	const pageEvent = () =>
		({
			locals: {},
			request: new Request('http://localhost/'),
			url: new URL('http://localhost/')
		}) as unknown as RequestEvent;

	it('signs nobody in and still serves the page when auth is not configured', async () => {
		const event = pageEvent();
		const response = await authHandle({ event, resolve: async () => new Response('page') });
		expect(await response.text()).toBe('page');
		expect(event.locals).toEqual({ user: null, session: null });
	});

	it('treats a failed session lookup (database down) as signed out instead of failing the page', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(tryGetAuth).mockReturnValueOnce({
			api: { getSession: () => Promise.reject(new Error('connection refused')) },
			handler: () => new Response('auth'),
			options: {}
		} as never);
		const event = pageEvent();
		const response = await authHandle({ event, resolve: async () => new Response('page') });
		expect(await response.text()).toBe('page');
		expect(event.locals).toEqual({ user: null, session: null });
	});
});

function lowercase(headers: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
	);
}
