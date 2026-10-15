import { addDays, monthOf } from './calendar.ts';

/** Check-ins can be added or removed for today and this many days before (spec §3.1). */
export const BACKFILL_DAYS = 3;

/**
 * Today and the 3 days before, newest first, inside the card's span and month. On the 1st–3rd that
 * reaches last month's card for its last days (spec §3.8).
 */
export function backfillDates(today: string, startDate: string): string[] {
	const dates: string[] = [];
	for (let back = 0; back <= BACKFILL_DAYS; back++) {
		const date = addDays(today, -back);
		if (date >= startDate && monthOf(date) === monthOf(startDate)) dates.push(date);
	}
	return dates;
}

/** The months whose cards can still be logged today, newest first. */
export function backfillMonths(today: string): string[] {
	return [...new Set([monthOf(today), monthOf(addDays(today, -BACKFILL_DAYS))])];
}

/** Whether a check-in on `date` can be added or removed today. */
export function canLog(date: string, today: string, startDate: string): boolean {
	return backfillDates(today, startDate).includes(date);
}
