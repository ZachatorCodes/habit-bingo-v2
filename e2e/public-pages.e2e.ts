import { expect, test } from '@playwright/test';

const publicPaths = ['/', '/privacy', '/terms'];

test('landing links to sign in', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
	await expect(page.getByText('Invite-only beta.')).toBeVisible();
	await expect(page.getByTestId('sample-card').getByRole('img')).toHaveCount(9);
});

for (const path of publicPaths) {
	test(`${path} does not scroll horizontally at 360px`, async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 780 });
		await page.goto(path);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test(`${path} is CDN-cacheable`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response?.headers()['cache-control']).toBe('public, max-age=0, s-maxage=3600');
	});

	test(`${path} has a title, description and canonical link`, async ({ page }) => {
		await page.goto(path);
		await expect(page).toHaveTitle(/Habit Bingo/);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			new RegExp(`${path}$`)
		);
	});

	test(`${path} footer links to privacy and terms`, async ({ page }) => {
		await page.goto(path);
		const footer = page.getByRole('contentinfo');
		await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
		await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
	});
}

test('the sample card does not animate with reduced motion', async ({ browser }) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await page.goto('/');
	await expect(page.getByTestId('sample-card')).toHaveAttribute('data-animating', 'false');
	await context.close();
});

test('the sample card animates once, then stops (WCAG 2.2.2)', async ({ page }) => {
	await page.goto('/');
	const card = page.getByTestId('sample-card');
	await expect(card).toHaveAttribute('data-animating', 'true');
	await expect(card).toHaveAttribute('data-animating', 'false', { timeout: 8000 });
	await expect(card.getByRole('img', { name: /: complete$/ })).toHaveCount(3);
});
