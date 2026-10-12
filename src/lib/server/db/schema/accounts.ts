// Our account tables: invites, admin-issued password resets, failed sign-ins for lockout, and
// per-IP auth attempts.
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

export const invite = pgTable('invite', {
	code: text('code').primaryKey(),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	// References `group` once groups exist (M8).
	groupId: text('group_id'),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	maxUses: integer('max_uses').notNull(),
	uses: integer('uses').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const passwordReset = pgTable('password_reset', {
	/** SHA-256 hex of the token; the token itself only ever lives in the link. */
	tokenHash: text('token_hash').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	/** The admin who issued it. The link stays valid if that admin's account is deleted. */
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true })
});

export const signInFailure = pgTable(
	'sign_in_failure',
	{
		id: serial('id').primaryKey(),
		username: text('username').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('sign_in_failure_username_created_at_idx').on(table.username, table.createdAt)]
);

/** Sign-in, sign-up and reset attempts per client IP, keyed `${scope}:${ip}` (see ip-limit.ts). */
export const authAttempt = pgTable(
	'auth_attempt',
	{
		id: serial('id').primaryKey(),
		key: text('key').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('auth_attempt_key_created_at_idx').on(table.key, table.createdAt)]
);
