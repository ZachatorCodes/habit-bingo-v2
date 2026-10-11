import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPwnedPassword } from './pwned.ts';

// SHA-1('password') = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

function fakeFetch(body: string, status = 200) {
	return vi.fn<typeof fetch>(async () => new Response(body, { status }));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('isPwnedPassword', () => {
	it('reports a password whose hash suffix is in the range response', async () => {
		const fetchFn = fakeFetch(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${PASSWORD_SUFFIX}:3\r\n`);
		expect(await isPwnedPassword('password', fetchFn)).toBe(true);
	});

	it('does not report a password whose suffix is absent', async () => {
		const fetchFn = fakeFetch('0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n');
		expect(await isPwnedPassword('password', fetchFn)).toBe(false);
	});

	it('ignores padding entries with a zero count', async () => {
		const fetchFn = fakeFetch(`${PASSWORD_SUFFIX}:0\r\n`);
		expect(await isPwnedPassword('password', fetchFn)).toBe(false);
	});

	it('sends only the first five hash characters, with padding requested', async () => {
		const fetchFn = fakeFetch('');
		await isPwnedPassword('password', fetchFn);
		expect(fetchFn).toHaveBeenCalledOnce();
		const [url, init] = fetchFn.mock.calls[0];
		expect(String(url)).toBe('https://api.pwnedpasswords.com/range/5BAA6');
		expect(new Headers(init?.headers).get('Add-Padding')).toBe('true');
	});

	it('fails open when the API is unreachable', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const fetchFn = vi.fn<typeof fetch>(async () => {
			throw new TypeError('fetch failed');
		});
		expect(await isPwnedPassword('password', fetchFn)).toBe(false);
		expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
			level: 'warn',
			source: 'hibp'
		});
	});

	it('fails open on a non-200 response', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(await isPwnedPassword('password', fakeFetch(`${PASSWORD_SUFFIX}:3`, 503))).toBe(false);
		expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
			level: 'warn',
			source: 'hibp'
		});
	});
});
