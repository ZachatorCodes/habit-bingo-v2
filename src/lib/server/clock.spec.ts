import { describe, expect, it } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { formatEditDeadline, localDate, requestNow, startOfLocalDay } from './clock';

describe('localDate', () => {
	it("uses the person's timezone", () => {
		const now = new Date('2026-10-31T11:30:00Z');
		expect(localDate(now, 'Pacific/Kiritimati')).toBe('2026-11-01');
		expect(localDate(now, 'Pacific/Pago_Pago')).toBe('2026-10-31');
		expect(localDate(now, 'UTC')).toBe('2026-10-31');
	});
});

describe('startOfLocalDay', () => {
	it('handles both sides of UTC and DST', () => {
		expect(startOfLocalDay('2026-11-01', 'Pacific/Kiritimati').toISOString()).toBe(
			'2026-10-31T10:00:00.000Z'
		);
		expect(startOfLocalDay('2026-10-31', 'Pacific/Pago_Pago').toISOString()).toBe(
			'2026-10-31T11:00:00.000Z'
		);
		// New York leaves DST on Nov 1, so Nov 2 starts at UTC-5 but Nov 1 at UTC-4.
		expect(startOfLocalDay('2026-11-02', 'America/New_York').toISOString()).toBe(
			'2026-11-02T05:00:00.000Z'
		);
		expect(startOfLocalDay('2026-11-01', 'America/New_York').toISOString()).toBe(
			'2026-11-01T04:00:00.000Z'
		);
		expect(startOfLocalDay('2026-10-12', 'UTC').toISOString()).toBe('2026-10-12T00:00:00.000Z');
	});
});

describe('formatEditDeadline', () => {
	it('formats the edit deadline', () => {
		expect(formatEditDeadline(new Date('2026-10-14T21:41:00Z'), 'UTC')).toMatch(
			/^Edits close \w{3} at \d{1,2}:\d{2} [AP]M$/
		);
		expect(formatEditDeadline(new Date('2026-10-14T21:41:00Z'), 'UTC')).toBe(
			'Edits close Wed at 9:41 PM'
		);
		expect(
			formatEditDeadline(startOfLocalDay('2026-11-01', 'America/New_York'), 'America/New_York')
		).toBe('Edits close at the end of Sat, Oct 31');
	});
});

describe('requestNow', () => {
	const jar = (value?: string) =>
		({ get: (name: string) => (name === 'hb_test_now' ? value : undefined) }) as unknown as Cookies;

	it('uses the test clock cookie only when the test clock is on', () => {
		const before = Date.now();
		expect(requestNow(jar('2026-10-26T12:00:00Z'), true)).toEqual(new Date('2026-10-26T12:00:00Z'));
		// Production: the cookie changes nothing (Review Focus 4).
		expect(requestNow(jar('2026-10-26T12:00:00Z'), false).getTime()).toBeGreaterThanOrEqual(before);
	});

	it('falls back to the real time without a valid cookie', () => {
		const before = Date.now();
		expect(requestNow(jar(), true).getTime()).toBeGreaterThanOrEqual(before);
		expect(requestNow(jar('not a date'), true).getTime()).toBeGreaterThanOrEqual(before);
	});
});
