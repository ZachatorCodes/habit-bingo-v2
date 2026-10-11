import { describe, expect, it, vi } from 'vitest';
import { checkPassword, PASSWORD_MESSAGES } from './password-policy.ts';

const notPwned = async () => false;

describe('checkPassword', () => {
	it.each([
		['short', 'tooShort'],
		['x'.repeat(129), 'tooLong']
	])('flags %s', async (password, problem) => {
		expect(await checkPassword(password, 'someone', notPwned)).toBe(problem);
	});

	it('allows exactly 10 and 128 characters', async () => {
		expect(await checkPassword('x'.repeat(10), 'someone', notPwned)).toBeNull();
		expect(await checkPassword('x'.repeat(128), 'someone', notPwned)).toBeNull();
	});

	it('rejects the username in any casing', async () => {
		expect(await checkPassword('Zach_Stuff1', 'zach_stuff1', notPwned)).toBe('sameAsUsername');
	});

	it('rejects breached passwords', async () => {
		expect(await checkPassword('correct horse battery', 'zach', async () => true)).toBe('breached');
	});

	it('skips the breach lookup when a cheaper rule already fails', async () => {
		const isPwned = vi.fn(async () => true);
		await checkPassword('short', 'zach', isPwned);
		expect(isPwned).not.toHaveBeenCalled();
	});

	it('accepts a good password', async () => {
		expect(await checkPassword('correct horse battery', null, notPwned)).toBeNull();
	});

	it('has the copy for every problem', () => {
		expect(PASSWORD_MESSAGES).toEqual({
			tooShort: 'Use at least 10 characters.',
			tooLong: 'Use at most 128 characters.',
			sameAsUsername: "Your password can't be your username.",
			breached: 'This password has appeared in a data breach. Choose a different one.'
		});
	});
});
