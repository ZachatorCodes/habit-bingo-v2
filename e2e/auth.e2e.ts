import { expect, test } from '@playwright/test';

test('Better Auth answers under /api/auth', async ({ request }) => {
	const res = await request.get('/api/auth/ok');
	expect(res.status()).toBe(200);
});

test('password sign-in is not reachable over HTTP', async ({ request }) => {
	const res = await request.post('/api/auth/sign-in/username', {
		data: { username: 'nobody', password: 'not a real password' }
	});
	expect(res.status()).toBe(404);
});

test('pages render for signed-out visitors', async ({ page }) => {
	const res = await page.goto('/');
	expect(res?.status()).toBe(200);
});
