import { expect, test } from '@playwright/test';

test('the E2E server has a working database', async ({ request }) => {
	const res = await request.get('/api/health');
	expect(res.status()).toBe(200);
	expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
});
