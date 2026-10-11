import { describe, expect, it } from 'vitest';
import { AVATAR_EMOJI, isValidTimezone } from './profile.ts';

describe('profile', () => {
	it('lists 24 distinct avatars', () => {
		expect(AVATAR_EMOJI).toHaveLength(24);
		expect(new Set(AVATAR_EMOJI).size).toBe(24);
	});

	it('accepts real timezones and UTC', () => {
		expect(isValidTimezone('UTC')).toBe(true);
		expect(isValidTimezone('Europe/London')).toBe(true);
	});

	it('rejects unknown timezones', () => {
		expect(isValidTimezone('Mars/Olympus')).toBe(false);
		expect(isValidTimezone('')).toBe(false);
	});
});
