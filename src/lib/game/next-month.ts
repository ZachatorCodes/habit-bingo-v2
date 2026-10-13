import { daysInMonth, monthOf } from './calendar.ts';

/** Next month's card can be built in the last this-many days of a month (spec §3.3). */
export const NEXT_MONTH_WINDOW_DAYS = 7;

/** The day building next month's card opens: day D − 6 of `month`. */
export function nextMonthOpens(month: string): string {
	const day = daysInMonth(month) - NEXT_MONTH_WINDOW_DAYS + 1;
	return `${month}-${String(day).padStart(2, '0')}`;
}

/** Whether `today` (user-local) is in the last 7 days of its month. */
export function canBuildNextMonth(today: string): boolean {
	return today >= nextMonthOpens(monthOf(today));
}

/**
 * The center square (spec §3.5): complete until the last 7 days of the card's month, then it asks
 * for next month's card — and stops counting — until that card is built.
 */
export function centerState(
	cardMonth: string,
	today: string,
	nextCardBuilt: boolean
): 'complete' | 'buildNext' {
	if (today < nextMonthOpens(cardMonth) || nextCardBuilt) return 'complete';
	return 'buildNext';
}
