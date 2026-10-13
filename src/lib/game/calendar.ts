/** Calendar arithmetic on plain strings: dates are YYYY-MM-DD, months YYYY-MM. No time zones involved. */

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function parseMonth(month: string): { year: number; month: number } {
	return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

export function monthOf(date: string): string {
	return date.slice(0, 7);
}

export function daysInMonth(month: string): number {
	const parsed = parseMonth(month);
	return parsed.month === 2 && isLeapYear(parsed.year) ? 29 : DAYS_IN_MONTH[parsed.month - 1];
}

export function lastDayOf(month: string): string {
	return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
	const parsed = parseMonth(month);
	const year = parsed.month === 12 ? parsed.year + 1 : parsed.year;
	const next = parsed.month === 12 ? 1 : parsed.month + 1;
	return `${String(year).padStart(4, '0')}-${String(next).padStart(2, '0')}`;
}

/** Days from `date` to the end of its month, counting `date` itself. */
export function daysLeftInMonth(date: string): number {
	return daysInMonth(monthOf(date)) - Number(date.slice(8, 10)) + 1;
}

export function monthName(month: string): string {
	return MONTH_NAMES[parseMonth(month).month - 1];
}

function toUtc(date: string): number {
	return Date.UTC(
		Number(date.slice(0, 4)),
		Number(date.slice(5, 7)) - 1,
		Number(date.slice(8, 10))
	);
}

/** The date `days` after (or before, when negative) `date`. */
export function addDays(date: string, days: number): string {
	return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
	return new Date(toUtc(date)).getUTCDay();
}
