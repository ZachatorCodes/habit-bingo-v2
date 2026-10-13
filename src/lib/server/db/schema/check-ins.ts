// Check-ins (spec §3.2, §5.3): how many times a square's habit was done on a date. One row per
// square and date; a count of 0 is no row.
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { cardSquare } from './cards.ts';

export const checkIn = pgTable(
	'check_in',
	{
		id: text('id').primaryKey(),
		squareId: text('square_id')
			.notNull()
			.references(() => cardSquare.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		count: integer('count').notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('check_in_square_id_date_unique').on(table.squareId, table.date),
		check('check_in_count_check', sql`${table.count} between 1 and 20`)
	]
);
