import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	authHandle,
	handle,
	handleError,
	publicCacheCookieHandle,
	routeHeadersHandle,
	securityHeadersHandle
} from './hooks.server';
import { tryGetAuth } from '#lib/server/auth/index.ts';
import { createTestAuth } from '#lib/server/auth/test-auth.ts';
import { session } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
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
					headers: { 'referrer-policy': 'strict-origin', 'x-frame-options': 'SAMEORIGIN' }
				})
		});
		expect(response.headers.get('referrer-policy')).toBe('strict-origin');
		// Every other header still wins over what the page set.
		expect(response.headers.get('x-frame-options')).toBe('DENY');
	});
});

describe('authHandle', () => {
	const pageEvent = () =>
		({
			locals: {},
			request: new Request('http://localhost/signin'),
			url: new URL('http://localhost/signin'),
			// Not a CDN-cached public page, so the hook looks the session up.
			route: { id: '/signin' }
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

describe('routeHeadersHandle', () => {
	const routed = (id: string | null) => ({ route: { id } }) as unknown as RequestEvent;

	it('keeps reset pages out of caches and referrers, on every response', async () => {
		for (const status of [200, 303, 400, 500]) {
			const response = await routeHeadersHandle({
				event: routed('/reset/[token]'),
				resolve: async () => new Response('x', { status })
			});
			expect(response.headers.get('cache-control')).toBe('no-store');
			expect(response.headers.get('referrer-policy')).toBe('strict-origin');
		}
	});

	it('never lets a cache keep the admin page or its action results', async () => {
		const response = await routeHeadersHandle({
			event: routed('/(app)/admin'),
			resolve: async () => new Response('x')
		});
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('referrer-policy')).toBeNull();
	});

	it('leaves other routes alone', async () => {
		const response = await routeHeadersHandle({
			event: routed('/signin'),
			resolve: async () => new Response('x', { headers: { 'cache-control': 'public' } })
		});
		expect(response.headers.get('cache-control')).toBe('public');
	});

	it('survives the security headers hook in the full chain', async () => {
		expect(handle).toBeTypeOf('function');
		const response = await securityHeadersHandle({
			event: routed('/reset/[token]'),
			resolve: async (event) =>
				routeHeadersHandle({ event, resolve: async () => Response.redirect('http://x/', 303) })
		});
		expect(response.headers.get('referrer-policy')).toBe('strict-origin');
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});

describe('public CDN-cached pages', () => {
	const PUBLIC = 'public, max-age=0, s-maxage=3600';
	const DAY = 24 * 60 * 60 * 1000;

	it('never refresh a session or set a cookie, even for a signed-in user with a stale session', async () => {
		const db = await createTestDb();
		let current: RequestEvent | undefined;
		const auth = createTestAuth(db, {
			bootstrapInviteCode: 'BOOT',
			getRequestEvent: () => current
		});
		const { headers } = await auth.api.signUpEmail({
			body: {
				email: `${crypto.randomUUID()}@users.invalid`,
				password: 'correct horse battery',
				name: 'Zach',
				username: 'zach'
			},
			headers: new Headers({ cookie: 'hb_invite=BOOT' }),
			returnHeaders: true
		});
		const cookie = headers
			.getSetCookie()
			.map((c) => c.split(';')[0])
			.join('; ');
		// Last refreshed two days ago: the next session lookup would refresh it and set a cookie.
		await db.update(session).set({ expiresAt: new Date(Date.now() + 28 * DAY) });

		async function visit(routeId: string, path: string) {
			const set = vi.fn();
			const event = {
				locals: {},
				request: new Request(`http://localhost${path}`, { headers: { cookie } }),
				url: new URL(`http://localhost${path}`),
				route: { id: routeId },
				cookies: { set, get: vi.fn(), getAll: () => [], delete: vi.fn(), serialize: vi.fn() }
			} as unknown as RequestEvent;
			current = event;
			vi.mocked(tryGetAuth).mockReturnValueOnce(auth);
			const response = await authHandle({
				event,
				resolve: async () => new Response('page', { headers: { 'cache-control': PUBLIC } })
			});
			return { set, response };
		}

		for (const [id, path] of [
			['/', '/'],
			['/privacy', '/privacy'],
			['/terms', '/terms'],
			['/robots.txt', '/robots.txt'],
			['/sitemap.xml', '/sitemap.xml']
		]) {
			const { set, response } = await visit(id, path);
			expect(set, id).not.toHaveBeenCalled();
			expect(response.headers.get('set-cookie'), id).toBeNull();
		}

		// Control: a private page does refresh the stale session.
		const { set } = await visit('/(app)/today', '/today');
		expect(set).toHaveBeenCalled();
	});

	it('strips Set-Cookie from any response a shared cache may store', async () => {
		const response = await publicCacheCookieHandle({
			event,
			resolve: async () => {
				const headers = new Headers({ 'cache-control': PUBLIC });
				headers.append('set-cookie', 'hb.session_token=abc; Path=/');
				headers.append('set-cookie', 'other=1; Path=/');
				return new Response('page', { headers });
			}
		});
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(response.headers.get('cache-control')).toBe(PUBLIC);
	});

	it('strips it from immutable responses too', async () => {
		const response = await publicCacheCookieHandle({
			event,
			resolve: async () => {
				const original = Response.redirect('http://localhost/', 302);
				const copy = new Response(null, original);
				copy.headers.set('cache-control', 'public, s-maxage=60');
				copy.headers.append('set-cookie', 'a=1');
				return copy;
			}
		});
		expect(response.headers.get('set-cookie')).toBeNull();
	});

	it('keeps Set-Cookie on private responses', async () => {
		for (const cacheControl of [null, 'private, no-store', 'no-store']) {
			const response = await publicCacheCookieHandle({
				event,
				resolve: async () => {
					const headers = new Headers({ 'set-cookie': 'hb.session_token=abc; Path=/' });
					if (cacheControl) headers.set('cache-control', cacheControl);
					return new Response('page', { headers });
				}
			});
			expect(response.headers.get('set-cookie')).toBe('hb.session_token=abc; Path=/');
		}
	});
});
