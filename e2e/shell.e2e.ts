import { expect, test } from '@playwright/test';
import { newMember } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

const mainNav = (page: import('@playwright/test').Page) =>
	page.getByRole('navigation', { name: 'Main' });

test('no header bar on signed-in pages', async ({ page }) => {
	await newMember(page);
	await page.goto('/today');
	await expect(page.getByRole('banner')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
	await page.goto('/me');
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
});

test('no site footer on signed-in pages', async ({ page }) => {
	await newMember(page);
	await page.goto('/today');
	await expect(page.getByRole('link', { name: 'Privacy' })).toHaveCount(0);
});

test('Me tab is current under /me', async ({ page }) => {
	await newMember(page);
	await page.goto('/me/habits');
	await expect(mainNav(page).getByRole('link', { name: 'Me' })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test('the tab bar covers content behind it', async ({ page }) => {
	await newMember(page);
	await page.goto('/today');
	const today = (await mainNav(page).getByRole('link', { name: 'Today' }).boundingBox())!;
	const card = (await mainNav(page).getByRole('link', { name: 'Card' }).boundingBox())!;
	const bar = (await mainNav(page).boundingBox())!;
	const x = (today.x + today.width + card.x) / 2;
	const y = bar.y + bar.height - 4;
	const covered = await page.evaluate(
		([px, py]) => document.elementFromPoint(px, py)?.closest('nav[aria-label="Main"]') !== null,
		[x, y]
	);
	expect(covered).toBe(true);
});

test('tab bar pads for the home indicator', async ({ page }) => {
	await newMember(page);
	await page.goto('/today');
	await page.evaluate(() => document.documentElement.style.setProperty('--safe-bottom', '34px'));
	const label = (await mainNav(page).getByText('Today').boundingBox())!;
	expect(844 - (label.y + label.height)).toBeGreaterThanOrEqual(34);
});

test('start URL leads to Today or sign-in', async ({ page, request }) => {
	const manifest = await (await request.get('/manifest.webmanifest')).json();
	expect(manifest.start_url).toBe('/today');
	await page.goto('/today');
	await expect(page).toHaveURL(/\/signin/);
});
