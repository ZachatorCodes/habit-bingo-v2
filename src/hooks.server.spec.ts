import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { authHandle, handleError, securityHeadersHandle } from './hooks.server';
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

	it('keeps a stricter Referrer-Policy a page set itself, e.g. one with a secret in its URL', async () => {
		const response = await securityHeadersHandle({
			event,
			resolve: async () =>
				new Response('ok', {
					headers: { 'referrer-policy': 'no-referrer', 'x-frame-options': 'SAMEORIGIN' }
				})
		});
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		// Every other header still wins over what the page set.
		expect(response.headers.get('x-frame-options')).toBe('DENY');
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

describe('handleError', () => {
	it('never logs the secret token from a reset link', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const token = 'A'.repeat(43);
		await handleError({
			kind: 'unknown',
			error: new Error('boom'),
			event: { url: new URL(`http://localhost/reset/${token}`) },
			status: 500,
			message: 'Internal Error'
		} as unknown as Parameters<typeof handleError>[0]);
		const output = logged.mock.calls.flat().join(' ');
		expect(output).toContain('/reset/[token]');
		expect(output).not.toContain(token);
		logged.mockRestore();
	});
});
