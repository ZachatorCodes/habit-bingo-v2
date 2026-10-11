// Better Auth's tables (user, session, account, verification, rate_limit), with our profile
// columns on `user`. Property names are what Better Auth's Drizzle adapter reads and writes;
// column names are snake_case. Keep in sync with `user.additionalFields` in create-auth.ts.
import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
	timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

export const WEEK_STARTS_ON = ['monday', 'sunday'] as const;
export type WeekStartsOn = (typeof WEEK_STARTS_ON)[number];

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		// Username plugin: lowercased for lookups, typed casing for display.
		username: text('username').unique(),
		displayUsername: text('display_username'),
		// Profile.
		avatarEmoji: text('avatar_emoji').notNull().default('🙂'),
		timezone: text('timezone').notNull().default('UTC'),
		weekStartsOn: text('week_starts_on', { enum: WEEK_STARTS_ON }).notNull().default('monday'),
		isAdmin: boolean('is_admin').notNull().default(false),
		onboardedAt: timestamp('onboarded_at', { withTimezone: true })
	},
	(table) => [
		check('user_week_starts_on_check', sql`${table.weekStartsOn} in ('monday', 'sunday')`)
	]
);

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		password: text('password'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const rateLimit = pgTable('rate_limit', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	count: integer('count').notNull(),
	lastRequest: bigint('last_request', { mode: 'number' }).notNull()
});
