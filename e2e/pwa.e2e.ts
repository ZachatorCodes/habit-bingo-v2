import { expect, test } from '@playwright/test';

test('serves a valid web app manifest with reachable icons', async ({ request }) => {
	const response = await request.get('/manifest.webmanifest');
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	expect(manifest).toMatchObject({
		name: 'Habit Bingo',
		short_name: 'Bingo',
		display: 'standalone',
		start_url: '/today',
		background_color: '#F5F1E8',
		theme_color: '#2F5D46'
	});
	expect(
		manifest.icons.map(
			(icon: { sizes: string; purpose: string }) => `${icon.sizes} ${icon.purpose}`
		)
	).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
	for (const icon of manifest.icons) {
		expect((await request.get(icon.src)).ok()).toBe(true);
	}
});

test('pages link the manifest, theme color, icon and apple-touch-icon', async ({
	page,
	request
}) => {
	await page.goto('/');
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		'/manifest.webmanifest'
	);
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#2F5D46');
	await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/icon\.svg$/);
	const touch = page.locator('link[rel="apple-touch-icon"]');
	await expect(touch).toHaveAttribute('href', /\/apple-touch-icon\.png$/);
	expect((await request.get('/apple-touch-icon.png')).ok()).toBe(true);
});
