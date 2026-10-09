import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	// Only `migrate` and `studio` need a database; `generate` works without one.
	dbCredentials: { url: process.env.DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
