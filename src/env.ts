import { defineEnvVars } from '@sveltejs/kit/env';

/** An optional variable: empty counts as unset. */
const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'Postgres connection string (Neon pooled URL). Optional: without it the app runs and /api/health reports degraded.',
		schema: optional
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret that signs session cookies and encrypts OAuth tokens; at least 32 characters (`openssl rand -base64 32`). Required for sign-in; without it auth is off.',
		schema: (value) => {
			if (value && value.length < 32) {
				throw new Error('BETTER_AUTH_SECRET must be at least 32 characters');
			}
			return value || undefined;
		}
	},
	BETTER_AUTH_URL: {
		description:
			"The app's public origin, e.g. https://habit-bingo.example. Optional: Better Auth infers it from the request.",
		schema: optional
	},
	GOOGLE_CLIENT_ID: {
		description:
			'Google OAuth client ID. Optional: Google sign-in is hidden unless both Google vars are set.',
		schema: optional
	},
	GOOGLE_CLIENT_SECRET: {
		description:
			'Google OAuth client secret. Optional: Google sign-in is hidden unless both Google vars are set.',
		schema: optional
	},
	BOOTSTRAP_INVITE_CODE: {
		description:
			'Invite code that lets the first person sign up (as admin) while no users exist. Optional; inert once anyone has signed up.',
		schema: optional
	}
});
