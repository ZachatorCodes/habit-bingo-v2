import { and, eq, gt, sql } from 'drizzle-orm';
import { canLog } from '#lib/game/backfill.ts';
import { monthOf } from '#lib/game/calendar.ts';
import { localDate } from '#lib/server/clock.ts';
import type { Db } from '#lib/server/db/client.ts';
import { card, cardSquare, checkIn } from '#lib/server/db/schema.ts';

/** A square's count on one date stops here (spec §3.2). */
export const MAX_COUNT = 20;

/** Every check-in on a card: square id → date → count. */
export async function getCheckIns(
	db: Db,
	cardId: string
): Promise<Map<string, Map<string, number>>> {
	const rows = await db
		.select({ squareId: checkIn.squareId, date: checkIn.date, count: checkIn.count })
		.from(checkIn)
		.innerJoin(cardSquare, eq(cardSquare.id, checkIn.squareId))
		.where(eq(cardSquare.cardId, cardId));
	const bySquare = new Map<string, Map<string, number>>();
	for (const row of rows) {
		const dates = bySquare.get(row.squareId) ?? new Map<string, number>();
		dates.set(row.date, row.count);
		bySquare.set(row.squareId, dates);
	}
	return bySquare;
}

/**
 * Adds (+1) or removes (−1) one check-in on a habit square of the person's current-month card.
 * Null when there is no such square for them (the route answers 404). Only today and the 3 days
 * before, inside the card's span, can change (spec §3.1).
 */
export async function logCheckIn(
	db: Db,
	user: { id: string; timezone: string },
	squareId: string,
	date: string,
	delta: 1 | -1,
	now: Date
): Promise<{ ok: true; count: number } | { ok: false; field: 'date'; message: string } | null> {
	const today = localDate(now, user.timezone);
	const [square] = await db
		.select({ startDate: card.startDate })
		.from(cardSquare)
		.innerJoin(card, eq(card.id, cardSquare.cardId))
		.where(
			and(
				eq(cardSquare.id, squareId),
				eq(cardSquare.isCenter, false),
				eq(card.userId, user.id),
				eq(card.month, monthOf(today))
			)
		);
	if (!square) return null;
	if (!canLog(date, today, square.startDate)) {
		return { ok: false, field: 'date', message: 'You can only log today and the 3 days before.' };
	}

	const where = and(eq(checkIn.squareId, squareId), eq(checkIn.date, date));
	if (delta === 1) {
		// One statement, so simultaneous taps each count.
		const [row] = await db
			.insert(checkIn)
			.values({ id: crypto.randomUUID(), squareId, date, count: 1 })
			.onConflictDoUpdate({
				target: [checkIn.squareId, checkIn.date],
				set: { count: sql`least(${checkIn.count} + 1, ${MAX_COUNT})`, updatedAt: now }
			})
			.returning({ count: checkIn.count });
		return { ok: true, count: row.count };
	}
	// Decrement only above 1, then delete at 1: each statement re-checks its condition under the
	// row lock, so simultaneous undos each count once and never break the 1–20 CHECK.
	const [row] = await db
		.update(checkIn)
		.set({ count: sql`${checkIn.count} - 1`, updatedAt: now })
		.where(and(where, gt(checkIn.count, 1)))
		.returning({ count: checkIn.count });
	if (row) return { ok: true, count: row.count };
	await db.delete(checkIn).where(and(where, eq(checkIn.count, 1)));
	return { ok: true, count: 0 };
}
