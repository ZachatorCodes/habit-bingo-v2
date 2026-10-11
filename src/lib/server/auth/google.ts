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
	if (!url) throw new Error('Google sign-in did not return a URL.');
	// Without a configured base URL, Better Auth's server-side calls know no origin and would send
	// Google a relative redirect_uri, which Google rejects with an error page.
	if (!URL.canParse(new URL(url).searchParams.get('redirect_uri') ?? '')) {
		throw new Error('Google sign-in needs BETTER_AUTH_URL to be set.');
	}
	return url;
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
