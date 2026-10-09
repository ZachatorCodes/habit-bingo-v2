import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

type VercelConfig = { headers?: { source: string; headers: { key: string; value: string }[] }[] };

describe('SECURITY_HEADERS', () => {
	// Vercel serves static files (icons, manifest, /_app/immutable) without running hooks.server.ts.
	it('are also set by vercel.json for every path, so static files carry them', () => {
		const config: VercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
		const rule = config.headers?.find((entry) => entry.source === '/(.*)');
		const fromVercel = Object.fromEntries(
			rule?.headers.map(({ key, value }) => [key, value]) ?? []
		);
		expect(fromVercel).toEqual(SECURITY_HEADERS);
	});
});
