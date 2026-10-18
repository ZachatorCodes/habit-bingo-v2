/** The Today greeting for a local hour (0-23). */
export function greeting(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening' {
	if (hour >= 5 && hour < 12) return 'Good morning';
	if (hour >= 12 && hour < 18) return 'Good afternoon';
	return 'Good evening';
}

/** One line on what is left for the day. */
export function todaySummary(left: number): string {
	if (left === 0) return 'All done for today';
	return `${left} ${left === 1 ? 'thing' : 'things'} to do today`;
}
