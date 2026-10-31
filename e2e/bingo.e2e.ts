import { expect, test, type Page } from '@playwright/test';
import { buildAndStartCard, newMemberWithHabits, setClock, waitForHydration } from './fixtures.ts';

// A card started Saturday Oct 24 (the center is still Free) from the first 8 Quick start habits,
// three of them monthly goals (Finish a book, Go biking, Call an old friend: each 1 for this card).
// The free square and a day of Scoop the litter box count; the three goals make 5, the "5 squares"
// reward. "At most" squares (Eat out) only count once the month is over.
async function freshCard(page: Page): Promise<void> {
	await newMemberWithHabits(page, 8);
	await setClock(page, '2026-10-24T12:00:00Z');
	await buildAndStartCard(page);
}

const GOALS = ['Finish a book', 'Go biking', 'Call an old friend'];

/** Logs a Today row `times` times, dismissing any reward that pops up on the way. */
async function logOnToday(page: Page, name: string, times = 1): Promise<void> {
	for (let i = 0; i < times; i++) {
		const saved = page.waitForResponse((r) => r.url().includes('/today/__data.json'));
		await page.getByRole('button', { name: `Log ${name}` }).click();
		await saved;
		const nice = page.getByRole('button', { name: 'Nice!' });
		if (await nice.isVisible()) await nice.click();
	}
}

/** Scoop the litter box today: the second square that counts. */
async function scoopToday(page: Page): Promise<void> {
	await page.goto('/today');
	await waitForHydration(page);
	await logOnToday(page, 'Scoop the litter box');
}

test('reaching a reward from Today celebrates and reveals it, once', async ({ page }) => {
	await freshCard(page);
	await scoopToday(page);
	for (const name of GOALS.slice(0, -1)) await logOnToday(page, name);
	await page.getByRole('button', { name: `Log ${GOALS.at(-1)}` }).click();
	const reveal = page.getByRole('dialog', { name: /BINGO!|Reward earned/ });
	await expect(reveal).toContainText('Movie night');
	await reveal.getByRole('button', { name: 'Nice!' }).click();
	await expect(reveal).toBeHidden();

	// A reload doesn't replay it.
	await page.reload();
	await waitForHydration(page);
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reaching a reward from the sheet closes it and celebrates on the card', async ({ page }) => {
	await freshCard(page);
	await scoopToday(page);
	await page.goto('/card');
	await waitForHydration(page);
	// 2 of 9 count (the center and Scoop the litter box); each goal adds one.
	for (const [i, name] of GOALS.entries()) {
		await page.getByRole('link', { name: new RegExp(`^${name}: `) }).click();
		const sheet = page.getByRole('dialog', { name });
		await expect(sheet).toBeVisible();
		const add = sheet.getByRole('button', { name: 'Add one' });
		if (await add.isVisible()) await add.click();
		else await sheet.getByRole('button', { name: 'Done that day' }).click();
		await expect(page.getByText(`${[33, 44, 56][i]}% counting`)).toBeAttached();
		if (name === GOALS.at(-1)) break;
		if ((await sheet.count()) > 0) await page.keyboard.press('Escape');
		await expect(sheet).toHaveCount(0);
		const nice = page.getByRole('button', { name: 'Nice!' });
		if (await nice.isVisible()) await nice.click();
	}
	await expect(page.getByRole('dialog', { name: /BINGO!|Reward earned/ })).toContainText(
		'Movie night'
	);
	await expect(page.getByRole('dialog', { name: 'Call an old friend' })).toHaveCount(0);
});
