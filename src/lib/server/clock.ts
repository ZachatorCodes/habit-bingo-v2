import type { Cookies } from '@sveltejs/kit';
// Time-zone arithmetic for a person's local day, using only Intl (no date library).

/** The local calendar date (YYYY-MM-DD) in `timezone` at `now`. */
export function localDate(now: Date, timezone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

/** The zone's offset from UTC at `at`, in milliseconds. */
function offsetMs(at: Date, timezone: string): number {
	const part = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		timeZoneName: 'longOffset'
	})
		.formatToParts(at)
		.find((p) => p.type === 'timeZoneName')?.value;
	const match = part?.match(/^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/);
	if (!match) throw new RangeError(`Unreadable offset "${part}" for ${timezone}.`);
	if (!match[1]) return 0;
	const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
	return (match[1] === '-' ? -1 : 1) * minutes * 60_000;
}

/** The instant a local day (YYYY-MM-DD) begins in `timezone`. */
export function startOfLocalDay(date: string, timezone: string): Date {
	const guess = Date.UTC(
		Number(date.slice(0, 4)),
		Number(date.slice(5, 7)) - 1,
		Number(date.slice(8, 10))
	);
	const first = guess - offsetMs(new Date(guess), timezone);
	// The offset at the guess can differ from the offset at the result across a DST change.
	return new Date(guess - offsetMs(new Date(first), timezone));
}

const WEEKDAY_TIME = (timezone: string) =>
	new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit'
	});

/** "Edits close Wed at 9:41 PM", or "...at the end of Sat, Oct 31" when the window ends at midnight. */
export function formatEditDeadline(editableUntil: Date, timezone: string): string {
	const date = localDate(editableUntil, timezone);
	if (startOfLocalDay(date, timezone).getTime() === editableUntil.getTime()) {
		const lastDay = new Date(editableUntil.getTime() - 12 * 3_600_000);
		const label = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		}).format(lastDay);
		return `Edits close at the end of ${label}`;
	}
	const parts = Object.fromEntries(
		WEEKDAY_TIME(timezone)
			.formatToParts(editableUntil)
			.map((p) => [p.type, p.value])
	);
	return `Edits close ${parts.weekday} at ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

/**
 * "Now" for a request. E2E runs set `TEST_CLOCK=1` and an `hb_test_now` cookie (an ISO instant)
 * to move through the month; anywhere else the cookie is ignored.
 */
export function requestNow(cookies: Cookies, testClock: boolean): Date {
	if (testClock) {
		const value = cookies.get('hb_test_now');
		const at = value ? new Date(value) : null;
		if (at && !Number.isNaN(at.getTime())) return at;
	}
	return new Date();
}

/** The local hour (0-23) in `timezone` at `now`. */
export function localHour(now: Date, timezone: string): number {
	return Number(
		new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' })
			.formatToParts(now)
			.find((p) => p.type === 'hour')?.value
	);
}
