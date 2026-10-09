import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { Db } from '#lib/server/db/client.ts';
import { account, rateLimit, session, user, verification } from '#lib/server/db/schema.ts';

export type AuthOptions = {
	secret: string;
	baseURL?: string;
	google?: { clientId: string; clientSecret: string };
	/** Whether a password appears in a breach corpus (Have I Been Pwned). Used by the sign-up hooks. */
	isPwned: (password: string) => Promise<boolean>;
	/** Invite code that lets the first admin sign up before any invite exists. */
	bootstrapInviteCode?: string;
};

/**
 * Every Better Auth route that would let a password be set, checked or changed, or an account be
 * changed, without our invite, lockout and breach rules. Our own form actions call `auth.api.*`
 * on the server instead, which still works.
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
	'/unlink-account'
];

/** The current request event, or undefined outside a request (tests, scripts, seeding). */
function currentRequestEvent(): RequestEvent {
	try {
		return getRequestEvent();
	} catch {
		// sveltekitCookies skips setting cookies when there is no event.
		return undefined as unknown as RequestEvent;
	}
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
		disabledPaths: DISABLED_PATHS,
		plugins: [
			username({
				minUsernameLength: 3,
				maxUsernameLength: 20,
				usernameValidator: (value) => /^[a-z0-9_]+$/i.test(value)
			}),
			// Must stay last: it copies Better Auth's Set-Cookie headers onto the SvelteKit response.
			sveltekitCookies(currentRequestEvent)
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;
