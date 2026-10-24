import { addDays, daysInMonth, weekday } from './calendar.ts';

/** Weeks of 7 cells for a YYYY-MM month; `null` pads the blanks before the 1st and after the last day. */
export function monthGrid(month: string, weekStartsOn: 'monday' | 'sunday'): (string | null)[][] {
	const first = `${month}-01`;
	const lead = (weekday(first) - (weekStartsOn === 'monday' ? 1 : 0) + 7) % 7;
	const cells: (string | null)[] = [
		...Array<null>(lead).fill(null),
		...Array.from({ length: daysInMonth(month) }, (_, i) => addDays(first, i))
	];
	while (cells.length % 7) cells.push(null);
	return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
