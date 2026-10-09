import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'Postgres connection string (Neon pooled URL). Optional: without it the app runs and /api/health reports degraded.',
		schema: (value) => value || undefined
	}
});
