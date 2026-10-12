import { isRedirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { account, invite, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import type { Auth } from './create-auth.ts';
import {
	GOOGLE_LINK_PATH,
	googleErrorMessage,
	googleLinkErrorMessage,
	redirectToGoogle,
	startGoogleLink,
	startGoogleSignIn
} from './google.ts';
import { createInvite } from './invites.ts';
import { createTestAuth } from './test-auth.ts';

const GOOGLE = { clientId: 'id', clientSecret: 'secret' };

let db: Db;
let auth: Auth;
let inviterId: string;

beforeEach(async () => {
	db = await createTestDb();
	auth = createTestAuth(db, { google: GOOGLE });
	inviterId = crypto.randomUUID();
	await db
		.insert(user)
		.values({ id: inviterId, name: 'Inviter', email: `${inviterId}@users.invalid` });
});

async function newInvite(maxUses = 1) {
	const { code } = await createInvite(
		db,
		{ createdBy: inviterId, expiresInDays: 7, maxUses },
		new Date()
	);
	return code;
}

async function usesOf(code: string) {
	const [row] = await db.select().from(invite).where(eq(invite.code, code));
	return row.uses;
}

/**
 * Makes Google's id-token sign-in accept unsigned test tokens, so the whole "Google says this is
 * who it is" path (find or create the user, our invite hook, a session) runs without calling Google.
 */
async function trustTestIdTokens(target: Auth) {
	const context = await target.$context;
	const google = context.socialProviders.find((provider) => provider.id === 'google');
	if (!google) throw new Error('Google is not configured');
	google.options = { ...google.options, verifyIdToken: async () => true };
}

/** An unsigned id token shaped like Google's; trustTestIdTokens skips the signature check. */
function idToken(sub: string, email: string) {
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const claims = {
		iss: 'https://accounts.google.com',
		aud: GOOGLE.clientId,
		iat: Math.floor(Date.now() / 1000),
		sub,
		email,
		email_verified: true,
		name: 'Google Person'
	};
	return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.unsigned`;
}

function signInWithGoogle(sub: string, email: string, inviteCode: string | null) {
	return auth.api.signInSocial({
		body: { provider: 'google', idToken: { token: idToken(sub, email) } },
		headers: new Headers(inviteCode === null ? {} : { cookie: `hb_invite=${inviteCode}` })
	});
}

describe('startGoogleSignIn', () => {
	it('builds a Google URL with only the default scopes', async () => {
		const url = new URL(await startGoogleSignIn(auth, new Headers(), '/today'));

		expect(url.host).toBe('accounts.google.com');
		expect(url.searchParams.get('client_id')).toBe(GOOGLE.clientId);
		expect(url.searchParams.get('redirect_uri')).toBe('http://localhost/api/auth/callback/google');
		const scopes = url.searchParams.get('scope')?.split(' ').sort();
		expect(scopes).toEqual(['email', 'openid', 'profile']);
		expect(url.toString()).not.toContain('calendar');
	});

	it('hands the OAuth state cookie to the SvelteKit response', async () => {
		const set: string[] = [];
		const event = {
			cookies: { set: (name: string) => set.push(name) }
		} as unknown as RequestEvent;
		const withEvent = createTestAuth(db, { google: GOOGLE, getRequestEvent: () => event });

		await startGoogleSignIn(withEvent, new Headers(), '/today');

		expect(set).toContain('hb.state');
	});

	it('remembers where to go afterwards, for new users and on errors', async () => {
		const url = new URL(await startGoogleSignIn(auth, new Headers(), '/today?tab=1'));
		const state = url.searchParams.get('state');
		const context = await auth.$context;
		const stored = await context.internalAdapter.findVerificationValue(`auth-state:${state}`);

		expect(JSON.parse(stored?.value ?? '{}')).toMatchObject({
			callbackURL: '/today?tab=1',
			errorURL: '/signin',
			newUserURL: '/onboarding'
		});
	});

	it('fails clearly when the app has no base URL for Google to return to', async () => {
		const noBaseURL = createTestAuth(db, { google: GOOGLE, baseURL: undefined });

		await expect(startGoogleSignIn(noBaseURL, new Headers(), '/today')).rejects.toThrow(
			/BETTER_AUTH_URL/
		);
	});

	it('fails when Google is not configured', async () => {
		await expect(startGoogleSignIn(createTestAuth(db), new Headers(), '/today')).rejects.toThrow();
	});
});

describe('Google accounts and invites', () => {
	it('refuses to create a Google user without an invite', async () => {
		const context = await auth.$context;

		await expect(
			context.internalAdapter.createOAuthUser(
				{ email: 'new@example.com', name: 'New', emailVerified: true },
				{ providerId: 'google', accountId: 'google-sub-new' }
			)
		).rejects.toMatchObject({ body: { code: 'INVITE_REQUIRED' } });
		expect(await db.select().from(user).where(eq(user.email, 'new@example.com'))).toEqual([]);
	});

	it('creates a Google user with a valid invite and uses it', async () => {
		await trustTestIdTokens(auth);
		const code = await newInvite();

		const result = await signInWithGoogle('google-sub-1', 'friend@example.com', code);

		expect(result).toMatchObject({ redirect: false, user: { email: 'friend@example.com' } });
		expect(await usesOf(code)).toBe(1);
		const [linked] = await db.select().from(account).where(eq(account.accountId, 'google-sub-1'));
		expect(linked).toMatchObject({ providerId: 'google' });
	});

	it('refuses a new Google user without an invite cookie', async () => {
		await trustTestIdTokens(auth);

		await expect(
			signInWithGoogle('google-sub-2', 'stranger@example.com', null)
		).rejects.toMatchObject({ body: { code: 'INVITE_REQUIRED' } });
		expect(await db.select().from(user).where(eq(user.email, 'stranger@example.com'))).toEqual([]);
	});

	it('lets an existing Google user sign in again without an invite', async () => {
		await trustTestIdTokens(auth);
		const code = await newInvite();
		await signInWithGoogle('google-sub-3', 'returning@example.com', code);

		const again = await signInWithGoogle('google-sub-3', 'returning@example.com', null);

		expect(again).toMatchObject({ redirect: false, user: { email: 'returning@example.com' } });
		expect(await usesOf(code)).toBe(1);
	});
});

describe('googleErrorMessage', () => {
	it('explains a missing invite, whatever the casing', () => {
		expect(googleErrorMessage('INVITE_REQUIRED')).toBe('You need an invite to join.');
		expect(googleErrorMessage('invite_required')).toBe('You need an invite to join.');
	});

	it('gives a generic message for any other error', () => {
		expect(googleErrorMessage('state_mismatch')).toBe("Google sign-in didn't work. Try again.");
		expect(googleErrorMessage('<script>')).toBe("Google sign-in didn't work. Try again.");
	});

	it('gives nothing when there is no error', () => {
		expect(googleErrorMessage(null)).toBeNull();
		expect(googleErrorMessage('')).toBeNull();
	});
});

describe('redirectToGoogle', () => {
	function thrown(fn: () => unknown) {
		try {
			fn();
		} catch (caught) {
			return caught;
		}
		throw new Error('expected a throw');
	}

	it("sends the browser to Google's sign-in page with a 303", async () => {
		const url = await startGoogleSignIn(auth, new Headers(), '/today');

		const redirect = thrown(() => redirectToGoogle(url));

		expect(isRedirect(redirect)).toBe(true);
		expect(redirect).toMatchObject({ status: 303, location: url });
	});

	it('refuses to redirect anywhere else', () => {
		const redirect = thrown(() => redirectToGoogle('https://evil.example/o/oauth2/v2/auth'));

		expect(isRedirect(redirect)).toBe(false);
	});
});

describe('startGoogleLink', () => {
	async function signedInHeaders() {
		const { headers } = await auth.api.signUpEmail({
			body: {
				email: `${crypto.randomUUID()}@users.invalid`,
				password: 'correct horse battery',
				name: 'Linker',
				username: 'linker'
			},
			headers: new Headers({ cookie: `hb_invite=${await newInvite()}` }),
			returnHeaders: true
		});
		const cookie = headers
			.getSetCookie()
			.map((c) => c.split(';')[0])
			.join('; ');
		return new Headers({ cookie });
	}

	it('links to the signed-in user and comes back to /me, with default scopes only', async () => {
		const url = new URL(await startGoogleLink(auth, await signedInHeaders()));
		expect(url.host).toBe('accounts.google.com');
		expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual([
			'email',
			'openid',
			'profile'
		]);
		const context = await auth.$context;
		const stored = await context.internalAdapter.findVerificationValue(
			`auth-state:${url.searchParams.get('state')}`
		);
		const [linker] = await db.select().from(user).where(eq(user.username, 'linker'));
		expect(JSON.parse(stored?.value ?? '{}')).toMatchObject({
			callbackURL: GOOGLE_LINK_PATH,
			errorURL: GOOGLE_LINK_PATH,
			link: { userId: linker.id }
		});
	});

	it('needs a session', async () => {
		await expect(startGoogleLink(auth, new Headers())).rejects.toThrow();
	});
});

describe('googleLinkErrorMessage', () => {
	it('explains an account linked elsewhere, and is generic otherwise', () => {
		expect(googleLinkErrorMessage('account_already_linked_to_different_user')).toBe(
			'That Google account is already linked to someone else.'
		);
		expect(googleLinkErrorMessage('anything_else')).toBe("Linking Google didn't work. Try again.");
		expect(googleLinkErrorMessage(null)).toBeNull();
	});
});
