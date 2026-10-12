import { APIError } from 'better-auth/api';
import type { Auth } from './create-auth.ts';
import { PASSWORD_MESSAGES } from './password-policy.ts';

export type SignUpResult =
	{ ok: true } | { ok: false; field: 'username' | 'password' | 'form'; message: string };

export const USERNAME_TAKEN_MESSAGE = 'That username is taken.';
export const USERNAME_RULES_MESSAGE = 'Use 3–20 letters, numbers or underscores.';
export const INVITE_INVALID_MESSAGE = 'This invite is no longer valid.';

/** Better Auth error codes, mapped to the field and copy we show. */
const ERRORS: Record<string, { field: 'username' | 'password' | 'form'; message: string }> = {
	USERNAME_IS_ALREADY_TAKEN: { field: 'username', message: USERNAME_TAKEN_MESSAGE },
	USERNAME_TOO_SHORT: { field: 'username', message: USERNAME_RULES_MESSAGE },
	USERNAME_TOO_LONG: { field: 'username', message: USERNAME_RULES_MESSAGE },
	INVALID_USERNAME: { field: 'username', message: USERNAME_RULES_MESSAGE },
	// Better Auth's own length checks; our policy hook normally rejects these first.
	PASSWORD_TOO_SHORT: { field: 'password', message: PASSWORD_MESSAGES.tooShort },
	PASSWORD_TOO_LONG: { field: 'password', message: PASSWORD_MESSAGES.tooLong },
	INVITE_REQUIRED: { field: 'form', message: INVITE_INVALID_MESSAGE },
	...Object.fromEntries(
		Object.entries(PASSWORD_MESSAGES).map(([code, message]) => [
			code,
			{ field: 'password' as const, message }
		])
	)
};

/**
 * Creates a password account and signs it in (Better Auth sets the session cookie on the current
 * request). The invite comes from the `hb_invite` cookie in `headers`; it is only used when the
 * sign-up succeeds.
 */
export async function signUpWithPassword(
	auth: Auth,
	input: { username: string; password: string; name: string },
	headers: Headers
): Promise<SignUpResult> {
	try {
		await auth.api.signUpEmail({
			body: {
				// Password-only users get a placeholder that is never shown or emailed.
				email: `${crypto.randomUUID()}@users.invalid`,
				password: input.password,
				name: input.name,
				username: input.username
			},
			headers
		});
		return { ok: true };
	} catch (error) {
		const code = error instanceof APIError ? error.body?.code : undefined;
		const mapped = code ? ERRORS[code] : undefined;
		if (mapped) return { ok: false, ...mapped };
		throw error;
	}
}
