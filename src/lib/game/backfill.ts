import { addDays, lastDayOf, monthOf } from './calendar.ts';

/** Days after a month ends that its card stays open for logging; the Today chips reach this far back. */
export const BACKFILL_DAYS = 3;

/**
 * Today and the 3 days before, newest first, inside the card's span and month. On the 1st–3rd that
 * reaches last month's card for its last days (spec §3.8).
 */
export function backfillDates(today: string, startDate: string): string[] {
	const dates: string[] = [];
	for (let back = 0; back <= BACKFILL_DAYS; back++) {
		const date = addDays(today, -back);
		if (canLog(date, today, startDate)) dates.push(date);
	}
	return dates;
}

/** The months whose cards can still be logged today, newest first. */
export function backfillMonths(today: string): string[] {
	return [...new Set([monthOf(today), monthOf(addDays(today, -BACKFILL_DAYS))])];
}

/** The month closes on the 4th: until then its days can be logged and nothing is settled. */
function isOpen(today: string, cardMonth: string): boolean {
	return today < addDays(lastDayOf(cardMonth), BACKFILL_DAYS + 1);
}

/** Every date of the card that can be logged today, newest first. */
export function loggableDates(today: string, startDate: string): string[] {
	const month = monthOf(startDate);
	if (!isOpen(today, month)) return [];
	const dates: string[] = [];
	const last = lastDayOf(month);
	for (let date = today < last ? today : last; date >= startDate; date = addDays(date, -1)) {
		dates.push(date);
	}
	return dates;
}

/** Whether a check-in on `date` can be added or removed today. */
export function canLog(date: string, today: string, startDate: string): boolean {
	return loggableDates(today, startDate).includes(date);
}
