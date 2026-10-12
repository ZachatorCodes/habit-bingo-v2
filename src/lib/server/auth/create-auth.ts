import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from '#lib/server/db/client.ts';
import { account, rateLimit, session, user, verification } from '#lib/server/db/schema.ts';
import { consumeInvite } from './invites.ts';
import { checkPassword, PASSWORD_MESSAGES } from './password-policy.ts';

export type AuthOptions = {
	secret: string;
	baseURL?: string;
	google?: { clientId: string; clientSecret: string };
	/** Whether a password appears in a breach corpus (Have I Been Pwned). Used by the sign-up hooks. */
	isPwned: (password: string) => Promise<boolean>;
	/** Invite code that lets the first admin sign up before any invite exists. */
	bootstrapInviteCode?: string;
	/**
	 * The current SvelteKit request event, or undefined outside a request. Lets Better Auth set its
	 * cookies on our responses. Injected (rather than imported from `$app/server`) so this module also
	 * loads outside Vite, e.g. in the E2E seed script.
	 */
	getRequestEvent?: () => RequestEvent | undefined;
};

/**
 * Every Better Auth route that would let a password be set, checked or changed, or an account be
 * changed, without our invite, lockout and breach rules, or that would reveal whether a username
 * exists. Our own form actions call `auth.api.*` on the server instead, which still works.
 */
export const DISABLED_PATHS = [
	'/sign-up/email',
	'/sign-in/email',
	'/sign-in/username',
	'/change-password',
	'/set-password',
	'/reset-password',
	'/request-password-reset',
	'/update-user',
	'/delete-user',
	'/revoke-sessions',
	'/link-social',
	'/unlink-account',
	// Unauthenticated "is this username taken?": a username-existence oracle.
	'/is-username-available',
	// Session-holder password guessing with no lockout.
	'/verify-password'
];

/** Cookie holding the invite code a visitor arrived with; set by the invite page. */
export const INVITE_COOKIE = 'hb_invite';

/**
 * Endpoints that set a password, and the body field carrying it. Keyed by route path, except
 * `setPassword`: in Better Auth 1.7 it is a server-only endpoint with no path of its own (hooks see
 * `/`), so it is recognised by the operation id of the `auth.api.setPassword` call.
 */
const PASSWORD_FIELDS = new Map([
	['/sign-up/email', 'password'],
	['/change-password', 'newPassword'],
	['setPassword', 'newPassword']
]);

/** The PASSWORD_FIELDS key for a hook's endpoint context. */
function passwordEndpoint(ctx: { path?: string; operationId?: unknown }): string | undefined {
	return ctx.operationId === 'setPassword' ? 'setPassword' : ctx.path;
}

function readCookie(headers: Headers | undefined, name: string): string | null {
	for (const part of headers?.get('cookie')?.split(';') ?? []) {
		const eq = part.indexOf('=');
		if (eq !== -1 && part.slice(0, eq).trim() === name) {
			try {
				return decodeURIComponent(part.slice(eq + 1).trim());
			} catch {
				return null;
			}
		}
	}
	return null;
}

function inviteRequired(): APIError {
	return new APIError('FORBIDDEN', {
		code: 'INVITE_REQUIRED',
		message: 'You need an invite to join.'
	});
}

export function createAuth(db: Db, options: AuthOptions) {
	return betterAuth({
		secret: options.secret,
		baseURL: options.baseURL,
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: { user, session, account, verification, rateLimit }
		}),
		emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
		socialProviders: options.google
			? {
					google: {
						clientId: options.google.clientId,
						clientSecret: options.google.clientSecret
					}
				}
			: undefined,
		user: {
			additionalFields: {
				avatarEmoji: { type: 'string', required: false, defaultValue: '🙂' },
				timezone: { type: 'string', required: false, defaultValue: 'UTC' },
				weekStartsOn: { type: ['monday', 'sunday'], required: false, defaultValue: 'monday' },
				isAdmin: { type: 'boolean', required: false, defaultValue: false, input: false },
				onboardedAt: { type: 'date', required: false, input: false }
			}
		},
		account: {
			encryptOAuthTokens: true,
			accountLinking: {
				enabled: true,
				disableImplicitLinking: true,
				allowDifferentEmails: true,
				allowUnlinkingAll: false
			}
		},
		session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
		rateLimit: { enabled: true, storage: 'database' },
		advanced: { cookiePrefix: 'hb' },
		// OAuth failures Better Auth cannot attribute to a sign-in (missing or forged state) land on
		// /signin?error=..., which shows the generic Google message, not Better Auth's bare error page.
		onAPIError: { errorURL: '/signin' },
		disabledPaths: DISABLED_PATHS,
		hooks: {
			// Runs before the endpoint (and before the username plugin's checks), so a rejected password
			// never reaches user creation and never uses an invite.
			before: createAuthMiddleware(async (ctx) => {
				const endpoint = passwordEndpoint(ctx);
				const field = endpoint && PASSWORD_FIELDS.get(endpoint);
				if (!field) return;
				const password: unknown = ctx.body?.[field];
				// Leave malformed bodies to the endpoint's own validation.
				if (typeof password !== 'string') return;
				let username: string | null;
				if (endpoint === '/sign-up/email') {
					// Without a username, the username plugin (whose hook runs after ours) copies
					// displayUsername into it, so compare against that too.
					const { username: typed, displayUsername } = ctx.body ?? {};
					username =
						typeof typed === 'string'
							? typed
							: typeof displayUsername === 'string'
								? displayUsername
								: null;
				} else {
					const current = await getSessionFromCtx(ctx);
					username = (current?.user as { username?: string | null } | undefined)?.username ?? null;
				}
				const problem = await checkPassword(password, username, options.isPwned);
				if (problem) {
					throw new APIError('BAD_REQUEST', { message: PASSWORD_MESSAGES[problem], code: problem });
				}
			})
		},
		databaseHooks: {
			user: {
				create: {
					// Every way of creating a user (password sign-up, Google) needs an invite. This runs after
					// the password and username checks, so only creations that will succeed use one.
					before: async (newUser, ctx) => {
						const code = readCookie(ctx?.headers, INVITE_COOKIE);
						if (!code) throw inviteRequired();
						if (options.bootstrapInviteCode && code === options.bootstrapInviteCode) {
							const [anyUser] = await db.select({ id: user.id }).from(user).limit(1);
							if (!anyUser) return { data: { ...newUser, isAdmin: true } };
						}
						if (!(await consumeInvite(db, code, new Date()))) throw inviteRequired();
					}
				}
			}
		},
		plugins: [
			username({
				minUsernameLength: 3,
				maxUsernameLength: 20,
				usernameValidator: (value) => /^[a-z0-9_]+$/i.test(value)
			}),
			// Must stay last: it copies Better Auth's Set-Cookie headers onto the SvelteKit response.
			// sveltekitCookies skips setting cookies when there is no event.
			sveltekitCookies(() => (options.getRequestEvent?.() ?? undefined) as unknown as RequestEvent)
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;
