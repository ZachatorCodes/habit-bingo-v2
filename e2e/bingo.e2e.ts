import { expect, test, type Page } from '@playwright/test';
import { buildAndStartCard, newMemberWithHabits, setClock, waitForHydration } from './fixtures.ts';

// A card started Tuesday Oct 20 from the first 8 Quick start habits: everything counts except the
// three monthly goals (Finish a book, Go biking, Call an old friend — each 1 for this card), so
// completing all three is a blackout.
async function freshCard(page: Page): Promise<void> {
	await newMemberWithHabits(page, 8);
	await setClock(page, '2026-10-20T12:00:00Z');
	await buildAndStartCard(page);
}

const GOALS = ['Finish a book', 'Go biking', 'Call an old friend'];

test('completing the card from Today celebrates and reveals the reward', async ({ page }) => {
	await freshCard(page);
	await page.goto('/today');
	await waitForHydration(page);
	for (const name of GOALS) {
		await page.getByRole('button', { name: `Log ${name}` }).click();
		await expect(page.getByRole('button', { name: `Undo one ${name}` })).toBeVisible();
		const nice = page.getByRole('button', { name: 'Nice!' });
		if (name !== GOALS.at(-1) && (await nice.isVisible())) await nice.click();
	}
	const reveal = page.getByRole('dialog', { name: 'BINGO!' });
	await expect(reveal).toContainText('A weekend away');
	await reveal.getByRole('button', { name: 'Nice!' }).click();
	await expect(reveal).toBeHidden();

	// A reload doesn't replay it.
	await page.reload();
	await waitForHydration(page);
	await expect(page.getByText('BINGO!')).toHaveCount(0);
	await expect(page.getByRole('dialog', { name: 'BINGO!' })).toHaveCount(0);
});

test('completing a line from the sheet closes it and celebrates on the card', async ({ page }) => {
	await freshCard(page);
	await page.goto('/card');
	await waitForHydration(page);
	// 6 of 9 count at the start; each goal adds one.
	for (const [i, name] of GOALS.entries()) {
		await page.getByRole('link', { name: new RegExp(`^${name}: `) }).click();
		const sheet = page.getByRole('dialog', { name });
		await expect(sheet).toBeVisible();
		const add = sheet.getByRole('button', { name: 'Add one' });
		if (await add.isVisible()) await add.click();
		else await sheet.getByRole('button', { name: 'Done that day' }).click();
		await expect(page.getByText(`${[78, 89, 100][i]}% counting`)).toBeAttached();
		if (name === GOALS.at(-1)) break;
		if ((await sheet.count()) > 0) await page.keyboard.press('Escape');
		await expect(sheet).toHaveCount(0);
	}
	await expect(page.getByRole('dialog', { name: 'BINGO!' })).toContainText('A weekend away');
	await expect(page.getByRole('dialog', { name: 'Call an old friend' })).toHaveCount(0);
	await expect(page.locator('main .ripple').first()).toBeAttached();
});
