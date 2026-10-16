// Friend groups (spec §3.9): a named circle with an invite link; members see each other's cards.
import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

export const group = pgTable('group', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	emoji: text('emoji').notNull().default('✨'),
	icon: text('icon').notNull().default('sparkle'),
	createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const groupMember = pgTable(
	'group_member',
	{
		groupId: text('group_id')
			.notNull()
			.references(() => group.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').$type<'owner' | 'member'>().notNull(),
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.groupId, table.userId] }),
		index('group_member_user_id_idx').on(table.userId),
		check('group_member_role_check', sql`${table.role} in ('owner', 'member')`)
	]
);
