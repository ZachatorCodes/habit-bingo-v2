import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	// Only `migrate` and `studio` need a database; `generate` works without one.
	// Migrations use Neon's direct (unpooled) connection when set (an empty value counts as unset); the app uses the pooled one.
	dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '' },
	verbose: true,
	strict: true
});
