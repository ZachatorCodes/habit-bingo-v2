import { expect, test } from '@playwright/test';

const expectedHeaders = {
	'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()',
	'x-frame-options': 'DENY',
	'cross-origin-opener-policy': 'same-origin'
};

for (const path of ['/', '/privacy', '/sitemap.xml', '/api/health']) {
	test(`${path} carries the security headers`, async ({ request }) => {
		const response = await request.get(path);
		expect(response.headers()).toMatchObject(expectedHeaders);
	});
}

test('HTML responses carry a CSP that forbids framing', async ({ request }) => {
	const csp = (await request.get('/')).headers()['content-security-policy'];
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("default-src 'self'");
});

test('the landing page hydrates with no CSP violations', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Got it' }).click();
	await expect(page.getByRole('button', { name: 'Got it' })).toBeHidden();
	expect(violations).toEqual([]);
});

test('unknown routes show the friendly not-found page', async ({ page }) => {
	const response = await page.goto('/definitely-not-a-page');
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
	await expect(page.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
});
