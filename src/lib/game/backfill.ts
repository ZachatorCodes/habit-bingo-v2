import { addDays, monthOf } from './calendar.ts';

/** Check-ins can be added or removed for today and this many days before (spec §3.1). */
export const BACKFILL_DAYS = 3;

/** Today and the 3 days before, newest first, inside the card's span and today's month. */
export function backfillDates(today: string, startDate: string): string[] {
	const dates: string[] = [];
	for (let back = 0; back <= BACKFILL_DAYS; back++) {
		const date = addDays(today, -back);
		if (date >= startDate && monthOf(date) === monthOf(today)) dates.push(date);
	}
	return dates;
}

/** Whether a check-in on `date` can be added or removed today. */
export function canLog(date: string, today: string, startDate: string): boolean {
	return backfillDates(today, startDate).includes(date);
}
