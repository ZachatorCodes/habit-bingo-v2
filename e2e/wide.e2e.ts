import { expect, test } from '@playwright/test';
import {
	buildAndStartCard,
	expectNoHorizontalScroll,
	newMember,
	newMemberWithHabits,
	waitForHydration
} from './fixtures.ts';

test('phone keeps bottom tabs', async ({ page }, info) => {
	test.skip(info.project.name !== 'phone');
	await newMember(page);
	await page.goto('/today');
	const box = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!;
	const viewport = page.viewportSize()!;
	expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(2);
	expect(box.height).toBeLessThan(120);
});

test('sidebar navigates and marks the current page', async ({ page }, info) => {
	test.skip(info.project.name === 'phone');
	await newMember(page);
	await page.goto('/today');
	await waitForHydration(page);
	const nav = page.getByRole('navigation', { name: 'Main' });
	const box = (await nav.boundingBox())!;
	expect(box.x).toBe(0);
	expect(box.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 2);
	const card = nav.getByRole('link', { name: 'Card' });
	await card.click();
	await expect(page).toHaveURL(/\/card$/);
	await expect(card).toHaveAttribute('aria-current', 'page');
	if (info.project.name === 'desktop') await expect(card.getByText('Card')).toBeVisible();
	else expect((await card.getByText('Card').boundingBox())!.width).toBeLessThanOrEqual(1); // sr-only
});

test('habit panel holds and returns focus', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop');
	await newMemberWithHabits(page, 8);
	await buildAndStartCard(page);
	await page.goto('/card');
	await waitForHydration(page);
	const square = page.getByRole('link', { name: /^Drink water: / });
	await square.click();
	const dialog = page.getByRole('dialog', { name: 'Drink water' });
	await expect(dialog).toBeVisible();
	const box = (await dialog.boundingBox())!;
	expect(Math.abs(box.x + box.width - page.viewportSize()!.width)).toBeLessThanOrEqual(2);
	expect(Math.abs(box.width - 420)).toBeLessThanOrEqual(4);
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press('Tab');
		// A modal dialog hands focus to the browser UI at its end (body), never to the page behind.
		expect(
			await dialog.evaluate(
				(d) => d.contains(document.activeElement) || document.activeElement === document.body
			)
		).toBe(true);
	}
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(square).toBeFocused();
});

test('no horizontal scroll at wide widths', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop');
	await newMember(page);
	for (const width of [768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		for (const route of ['/today', '/card']) {
			await page.goto(route);
			await waitForHydration(page);
			await expectNoHorizontalScroll(page);
		}
	}
});
