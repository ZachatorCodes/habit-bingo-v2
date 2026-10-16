import { describe, expect, it } from 'vitest';
import { isValidTimezone } from './profile.ts';

describe('profile', () => {
	it('accepts real timezones and UTC', () => {
		expect(isValidTimezone('UTC')).toBe(true);
		expect(isValidTimezone('Europe/London')).toBe(true);
	});

	it('rejects unknown timezones', () => {
		expect(isValidTimezone('Mars/Olympus')).toBe(false);
		expect(isValidTimezone('')).toBe(false);
	});
});
