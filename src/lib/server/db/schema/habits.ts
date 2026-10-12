// A person's habit library (spec §3.2, §5.3). Cards snapshot habits, so edits never change a card.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

export const habit = pgTable(
	'habit',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		emoji: text('emoji').notNull(),
		name: text('name').notNull(),
		category: text('category').notNull(),
		direction: text('direction').notNull(),
		period: text('period').notNull(),
		countMode: text('count_mode').notNull(),
		target: integer('target').notNull(),
		isPrivate: boolean('is_private').notNull().default(false),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('habit_user_id_archived_at_idx').on(table.userId, table.archivedAt),
		check('habit_direction_check', sql`${table.direction} in ('atLeast', 'atMost')`),
		check('habit_period_check', sql`${table.period} in ('day', 'week', 'month')`),
		check('habit_count_mode_check', sql`${table.countMode} in ('times', 'days')`),
		check(
			'habit_category_check',
			sql`${table.category} in ('fitness', 'health', 'mind', 'home', 'social', 'learning', 'creative', 'money', 'other')`
		)
	]
);
