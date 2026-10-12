import { redirect } from '@sveltejs/kit';
import type { Auth } from './create-auth.ts';

/** Where Google sign-in failures land; /signin turns `?error=` into a message. */
export const GOOGLE_ERROR_PATH = '/signin';

/** Where a brand-new Google account lands. */
export const GOOGLE_NEW_USER_PATH = '/onboarding';

/**
 * Starts "Continue with Google" and returns Google's authorization URL to redirect to. Better Auth
 * stores the OAuth state and sets its state cookie on the current SvelteKit response (through the
 * sveltekitCookies plugin). Scopes are Better Auth's defaults only: openid, email and profile.
 */
export async function startGoogleSignIn(
	auth: Auth,
	headers: Headers,
	callbackURL: string
): Promise<string> {
	const { url } = await auth.api.signInSocial({
		body: {
			provider: 'google',
			callbackURL,
			errorCallbackURL: GOOGLE_ERROR_PATH,
			newUserCallbackURL: GOOGLE_NEW_USER_PATH,
			disableRedirect: true
		},
		headers
	});
	return checkedGoogleURL(url);
}

function checkedGoogleURL(url: string | undefined): string {
	if (!url) throw new Error('Google sign-in did not return a URL.');
	// Without a configured base URL, Better Auth's server-side calls know no origin and would send
	// Google a relative redirect_uri, which Google rejects with an error page.
	if (!URL.canParse(new URL(url).searchParams.get('redirect_uri') ?? '')) {
		throw new Error('Google sign-in needs BETTER_AUTH_URL to be set.');
	}
	return url;
}

/** Where linking Google lands, on success and (with `?error=`) on failure. */
export const GOOGLE_LINK_PATH = '/me';

/**
 * Starts linking Google to the signed-in user (the session in `headers`) and returns Google's
 * authorization URL. Linking only ever happens this way, never implicitly by email.
 */
export async function startGoogleLink(auth: Auth, headers: Headers): Promise<string> {
	const { url } = await auth.api.linkSocialAccount({
		body: {
			provider: 'google',
			callbackURL: GOOGLE_LINK_PATH,
			errorCallbackURL: GOOGLE_LINK_PATH,
			disableRedirect: true
		},
		headers
	});
	return checkedGoogleURL(url);
}

/** The only external origin our sign-in forms may redirect to (see also CSP `form-action`). */
export const GOOGLE_SIGN_IN_ORIGIN = 'https://accounts.google.com';

/**
 * Throws SvelteKit's 303 redirect to Google's sign-in page. SvelteKit refuses external redirects
 * unless allowed, so this allows Google's origin and nothing else.
 */
export function redirectToGoogle(url: string): never {
	redirect(303, url, { external: [GOOGLE_SIGN_IN_ORIGIN] });
}

export const INVITE_REQUIRED_MESSAGE = 'You need an invite to join.';
export const GOOGLE_FAILED_MESSAGE = "Google sign-in didn't work. Try again.";

/** The message for a Google sign-in error code that Better Auth put in `?error=`, if any. */
export function googleErrorMessage(code: string | null): string | null {
	if (!code) return null;
	return code.toUpperCase() === 'INVITE_REQUIRED' ? INVITE_REQUIRED_MESSAGE : GOOGLE_FAILED_MESSAGE;
}

export const GOOGLE_LINKED_ELSEWHERE_MESSAGE =
	'That Google account is already linked to someone else.';
export const GOOGLE_LINK_FAILED_MESSAGE = "Linking Google didn't work. Try again.";

/** The message for a Google linking error code that Better Auth put in `?error=`, if any. */
export function googleLinkErrorMessage(code: string | null): string | null {
	if (!code) return null;
	return code.toLowerCase() === 'account_already_linked_to_different_user'
		? GOOGLE_LINKED_ELSEWHERE_MESSAGE
		: GOOGLE_LINK_FAILED_MESSAGE;
}
