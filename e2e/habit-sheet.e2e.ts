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
	await expect(sheet.getByRole('list', { name: 'History' })).toContainText('Mon 19 — 2');
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
	await expect(sheet).toContainText('1 of 2 this week');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(sheet).toContainText('0 of 2 this week');
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
