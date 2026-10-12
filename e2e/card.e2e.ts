import { expect, test, type Page } from '@playwright/test';
import { newMemberWithHabits, newMemberWithoutJs, waitForHydration } from './fixtures.ts';

/** Builds a 3×3 card up to the Board step with the first nine habits. */
async function buildToBoard(page: Page): Promise<void> {
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await waitForHydration(page);
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: /3×3/ }) })
		.click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < 9; i++) await labels.nth(i).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/rewards$/);
	await waitForHydration(page);
	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board$/);
	await waitForHydration(page);
}

/** The squares' accessible names, in board order. */
async function squareNames(page: Page): Promise<string[]> {
	return page
		.locator('main [role="img"]')
		.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
}

test('a new member builds and starts a 3×3 card', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await buildToBoard(page);
	await expect(
		page.getByText(
			'You can change habits, targets, rewards and the board for 48 hours after you start.'
		)
	).toBeVisible();
	expect(await squareNames(page)).toHaveLength(9);

	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?started=1$/);
	await expect(page.getByRole('heading', { name: /\w+ card$/ })).toBeVisible();
	await expect(page.getByText('Card started!')).toBeVisible();
	expect(await squareNames(page)).toHaveLength(9);
	await expect(page.getByText('Ice cream')).toBeVisible();
	await expect(page.getByText('5 squares')).toBeVisible();
	await expect(page.getByText('Movie night')).toBeVisible();
	await expect(page.getByText('A weekend away')).toBeVisible();
	await expect(page.getByText(/Edits close/)).toBeVisible();

	// The draft is gone: building again goes to the card.
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card$/);
});

test('shuffle changes the board but keeps the habits', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await buildToBoard(page);
	const before = await squareNames(page);
	let after = before;
	for (let tries = 0; tries < 5 && after.join() === before.join(); tries++) {
		await page.getByRole('button', { name: 'Shuffle again' }).click();
		// The page reloads its data; give it a moment, then read the board.
		await page.waitForTimeout(500);
		after = await squareNames(page);
	}
	expect(after.join()).not.toBe(before.join());
	expect([...after].sort()).toEqual([...before].sort());
	await expect(page).toHaveURL(/\/card\/build\/board$/);
});

test('Today and the nav lead to the card', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await page.goto('/today');
	await expect(page.getByText('No card yet.')).toBeVisible();
	await page.getByRole('link', { name: 'Build one' }).click();
	await expect(page).toHaveURL(/\/card\/build\/size$/);

	const nav = page.getByRole('navigation', { name: 'Main' });
	await nav.getByRole('link', { name: 'Card' }).click();
	await expect(page).toHaveURL(/\/card$/);
	await expect(page.getByText(/No card for \w+ yet\./)).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Card' })).toHaveAttribute('aria-current', 'page');

	await buildToBoard(page);
	await expect(nav.getByRole('link', { name: 'Card' })).toHaveAttribute('aria-current', 'page');
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?started=1$/);

	await page.goto('/today');
	await expect(page.getByText(/Your \w+ card is ready\./)).toBeVisible();
	await page.getByRole('link', { name: 'See your card' }).click();
	await expect(page).toHaveURL(/\/card$/);
});

test('a draft in progress offers to continue building', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await buildToBoard(page);
	await page.goto('/card');
	await page.getByRole('link', { name: 'Continue building' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board$/);
});

test('starting twice makes one card', async ({ page, baseURL }) => {
	await newMemberWithHabits(page, 9);
	await buildToBoard(page);
	const post = () =>
		page.request.post('/card/build/board?/start', {
			headers: { origin: baseURL!, accept: 'text/html' },
			form: {}
		});
	const responses = await Promise.all([post(), post()]);
	for (const response of responses) expect(response.url()).toMatch(/\/card(\?started=1)?$/);
	expect(responses.filter((r) => r.url().endsWith('started=1'))).toHaveLength(1);

	await page.goto('/card');
	expect(await squareNames(page)).toHaveLength(9);
});

test('a habit archived before starting sends you back to Habits', async ({ page, baseURL }) => {
	await newMemberWithHabits(page, 10);
	await buildToBoard(page);
	const name = (await squareNames(page))[0].split(':')[0];

	await page.goto('/me/habits');
	await waitForHydration(page);
	await page.getByRole('button', { name: `Archive ${name}`, exact: true }).click();
	await expect(page.getByRole('button', { name: `Archive ${name}`, exact: true })).toHaveCount(0);

	const response = await page.request.post('/card/build/board?/start', {
		headers: { origin: baseURL!, accept: 'text/html' },
		form: {}
	});
	expect(response.url()).toContain('/card/build/habits');
	await page.goto('/card/build/board');
	await expect(page).toHaveURL(/\/card\/build\/habits/);
	await page.goto('/card');
	await expect(page.getByText(/No card for \w+ yet\./)).toBeVisible();
});

test('the whole builder works without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await newMemberWithoutJs(page);
	await page.goto('/me/habits?welcome=1');
	for (let i = 1; i <= 9; i++) {
		await page.getByRole('button', { name: /^Add / }).first().click();
		await expect(page.getByRole('button', { name: / added$/ })).toHaveCount(i);
	}

	await page.goto('/card/build');
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: /3×3/ }) })
		.click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < 9; i++) await labels.nth(i).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/rewards$/);
	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board$/);
	await page.getByRole('button', { name: 'Shuffle again' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board/);
	await expect(page.getByRole('button', { name: 'Start card' })).toBeVisible();
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?started=1$/);
	await expect(page.getByText('Card started!')).toBeVisible();
	expect(await squareNames(page)).toHaveLength(9);
	await context.close();
});

test('the welcome panel links to the builder', async ({ page }) => {
	await newMemberWithHabits(page, 1);
	await page.goto('/me/habits?welcome=1');
	await page.getByRole('link', { name: /Build your first card/ }).click();
	await expect(page).toHaveURL(/\/card\/build\/size$/);
});
