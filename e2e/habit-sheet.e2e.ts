import { expect, test, type Page } from '@playwright/test';
import {
	buildAndStartCard,
	newMember,
	newMemberWithHabits,
	setClock,
	waitForHydration
} from './fixtures.ts';

// First 8 Quick start habits; the card starts Thursday Oct 15 and "today" is Tuesday Oct 20.
async function onCard(page: Page): Promise<void> {
	await newMemberWithHabits(page, 8);
	await setClock(page, '2026-10-15T12:00:00Z');
	await buildAndStartCard(page);
	await setClock(page, '2026-10-20T12:00:00Z');
	await page.goto('/card');
	await waitForHydration(page);
}

const square = (page: Page, name: string) =>
	page.getByRole('link', { name: new RegExp(`^${name}: `) });

test('tapping a square opens its sheet and the back button closes it', async ({ page }) => {
	await onCard(page);
	await square(page, 'Drink water').click();
	const sheet = page.getByRole('dialog', { name: 'Drink water' });
	await expect(sheet).toBeVisible();
	await expect(sheet).toContainText('8 times a day');
	await expect(sheet).toContainText('Health');
	await expect(page).toHaveURL(/\/card\/squares\/[0-9a-f-]{36}$/);
	await page.goBack();
	await expect(sheet).toBeHidden();
	await expect(page).toHaveURL(/\/card$/);
	await square(page, 'Drink water').click();
	await page.getByRole('button', { name: 'Close' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(square(page, 'Drink water')).toBeFocused();
});

test('logging another day from the sheet', async ({ page }) => {
	await onCard(page);
	await square(page, 'Drink water').click();
	const sheet = page.getByRole('dialog', { name: 'Drink water' });
	await sheet.getByRole('link', { name: 'Yesterday' }).click();
	await expect(sheet.getByRole('link', { name: 'Yesterday' })).toHaveAttribute(
		'aria-current',
		'date'
	);
	await sheet.getByRole('button', { name: 'Add one' }).click();
	await expect(sheet.getByRole('status', { name: 'Count' })).toHaveText('1');
	await sheet.getByRole('button', { name: 'Add one' }).click();
	await expect(sheet.getByRole('status', { name: 'Count' })).toHaveText('2');
	await expect(sheet.getByRole('list', { name: 'History' })).toContainText(/Mon 19\s*2/);
	await sheet.getByRole('button', { name: 'Remove one' }).click();
	await expect(sheet.getByRole('status', { name: 'Count' })).toHaveText('1');
});

test('the days toggle marks and clears a day', async ({ page }) => {
	await onCard(page);
	await square(page, 'Meditate').click();
	const sheet = page.getByRole('dialog', { name: 'Meditate' });
	const toggle = sheet.getByRole('button', { name: 'Done that day' });
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(sheet).toContainText('1 more · 5 days left');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(sheet).toContainText('2 more · 5 days left');
});

test('the sheet works without JavaScript', async ({ page, browser }) => {
	await onCard(page);
	const href = await square(page, 'Drink water').getAttribute('href');
	const context = await browser.newContext({ javaScriptEnabled: false });
	await context.addCookies(await page.context().cookies());
	const noJs = await context.newPage();
	await noJs.goto(href!);
	await expect(noJs.getByRole('heading', { level: 1, name: 'Drink water' })).toBeVisible();
	await noJs.getByRole('button', { name: 'Add one' }).click();
	await expect(noJs.getByRole('status', { name: 'Count' })).toHaveText('1');
	await noJs.getByRole('link', { name: 'Back to card' }).click();
	await expect(noJs).toHaveURL(/\/card$/);
	await context.close();
});

test("someone else's square, the center, or a missing one is 404", async ({ page, browser }) => {
	await onCard(page);
	const href = await square(page, 'Drink water').getAttribute('href');
	const other = await (await browser.newContext()).newPage();
	await newMember(other);
	expect((await other.goto(href!))?.status()).toBe(404);
	expect((await page.goto('/card/squares/not-a-square'))?.status()).toBe(404);
});

test('closing the sheet before a save finishes keeps it closed', async ({ page }) => {
	await onCard(page);
	await square(page, 'Drink water').click();
	let release = () => {};
	const held = new Promise<void>((resolve) => (release = resolve));
	const isLog = (url: URL) =>
		url.pathname.startsWith('/card/squares/') && url.search.startsWith('?/log');
	await page.route(isLog, async (route) => {
		await held;
		await route.continue();
	});
	const answered = page.waitForResponse((r) => isLog(new URL(r.url())));
	await page.getByRole('dialog').getByRole('button', { name: 'Add one' }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
	release();
	await answered;
	await page.waitForTimeout(500);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).toHaveURL(/\/card$/);
});

test('a double tap opens one sheet that still closes', async ({ page }) => {
	await onCard(page);
	// Two taps in the same moment, before the first sheet has loaded.
	await square(page, 'Drink water').evaluate((link: HTMLElement) => {
		link.click();
		link.click();
	});
	await expect(page.getByRole('dialog', { name: 'Drink water' })).toBeVisible();
	await page.getByRole('button', { name: 'Close' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).toHaveURL(/\/card$/);
});

test('tapping Card again keeps the latest board', async ({ page }) => {
	await onCard(page);
	const points = () =>
		page
			.getByText(/^\d+\s*pts$/)
			.first()
			.innerText();
	const before = await points();
	await square(page, 'Go biking').click();
	await page.getByRole('dialog').getByRole('button', { name: 'Add one' }).click();
	await expect(page.getByRole('dialog').getByRole('status', { name: 'Count' })).toHaveText('1');
	await expect.poll(points).not.toBe(before);
	const after = await points();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Card' }).click();
	await page.waitForTimeout(500);
	expect(await points()).toBe(after);
});
