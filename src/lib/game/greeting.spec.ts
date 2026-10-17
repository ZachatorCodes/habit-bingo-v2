import { describe, expect, it } from 'vitest';
import { greeting, todaySummary } from './greeting.ts';

describe('greeting', () => {
	it.each([
		[5, 'Good morning'],
		[11, 'Good morning'],
		[12, 'Good afternoon'],
		[17, 'Good afternoon'],
		[18, 'Good evening'],
		[0, 'Good evening'],
		[4, 'Good evening']
	])('greeting(%i) is %s', (h, text) => expect(greeting(h)).toBe(text));
});

describe('todaySummary', () => {
	it('when nothing is left', () => expect(todaySummary(0)).toBe('All done for today'));
	it('counts things', () => {
		expect(todaySummary(1)).toBe('1 thing to do today');
		expect(todaySummary(3)).toBe('3 things to do today');
	});
});
