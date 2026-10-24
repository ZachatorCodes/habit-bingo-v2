import { expect, test, type Page } from '@playwright/test';
import { newMemberWithHabits, setClock, waitForHydration } from './fixtures.ts';

// The center square (spec §3.5): complete until the last 7 days of the month, then it asks for
// next month's card. The E2E server's test clock moves "now" (see setClock).

const OCT_20 = '2026-10-20T12:00:00Z';
const OCT_26 = '2026-10-26T12:00:00Z';

/** From the first builder step (whatever its URL), builds a 3×3 card to the Board step. */
async function buildToBoard(page: Page, query = ''): Promise<void> {
	const q = query.replace(/[?]/g, '[?]');
	await expect(page).toHaveURL(new RegExp(`/card/build/size${q}$`));
	await waitForHydration(page);
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: /3×3/ }) })
		.click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(new RegExp(`/card/build/habits${q}$`));
	await waitForHydration(page);
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < 8; i++) await labels.nth(i).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(new RegExp(`/card/build/targets${q}$`));
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(new RegExp(`/card/build/rewards${q}$`));
	await waitForHydration(page);
	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(new RegExp(`/card/build/board${q}$`));
	await waitForHydration(page);
}

/** A new member with an October card started on `iso`. */
async function octoberCard(page: Page, iso: string): Promise<void> {
	await newMemberWithHabits(page, 8);
	await setClock(page, iso);
	await page.goto('/card/build');
	await buildToBoard(page);
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?started=1$/);
}

const center = (page: Page) => page.locator('main [role="img"][data-state]').nth(4);

test('the center square is free before the last 7 days', async ({ page }) => {
	await octoberCard(page, OCT_20);
	await expect(center(page)).toHaveAttribute('aria-label', 'Free');
	await expect(page.getByRole('link', { name: /Build November's card/ })).toHaveCount(0);
});

test("in the last 7 days the center asks for next month's card", async ({ page }) => {
	await octoberCard(page, OCT_20);
	await setClock(page, OCT_26);
	await page.goto('/card');
	await expect(
		page.getByRole('link', { name: "Build November's card: build next month's card" })
	).toBeVisible();
});

test('building next month from the center square', async ({ page }) => {
	await octoberCard(page, OCT_26);
	await page.getByRole('link', { name: /Build November's card/ }).click();
	await expect(
		page.getByRole('heading', { level: 1, name: 'Your November card · starts November 1' })
	).toBeVisible();
	await buildToBoard(page, '?for=next');
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?planned=1$/);
	await expect(page.getByText('November card saved. It starts November 1.')).toBeVisible();
	// Still October's card on Card; the center now says November is ready.
	await expect(page.getByRole('heading', { level: 1, name: 'October card' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'November ready: complete' })).toBeVisible();
});

test("the center square opens next month's card for editing", async ({ page }) => {
	await octoberCard(page, OCT_26);
	await page.getByRole('link', { name: /Build November's card/ }).click();
	await buildToBoard(page, '?for=next');
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?planned=1$/);

	await page.getByRole('link', { name: 'November ready: complete' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits\?for=next$/);
	await page.goto('/card/build/rewards?for=next');
	await waitForHydration(page);
	await page.getByLabel('First bingo').fill('Pancakes');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board\?for=next$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page).toHaveURL(/\/card\?saved=1$/);
});

test('next month’s card shows up on the 1st', async ({ page }) => {
	await octoberCard(page, OCT_26);
	await page.getByRole('link', { name: /Build November's card/ }).click();
	await buildToBoard(page, '?for=next');
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?planned=1$/);

	// Review Focus 3: only the current month's card shows, until its month begins.
	await setClock(page, '2026-10-31T12:00:00Z');
	await page.goto('/card');
	await expect(page.getByRole('heading', { level: 1, name: 'October card' })).toBeVisible();
	await setClock(page, '2026-11-01T12:00:00Z');
	await page.goto('/card');
	await expect(page.getByRole('heading', { level: 1, name: 'November card' })).toBeVisible();
	await page.goto('/today');
	await expect(page.getByRole('link', { name: 'See your November card' })).toBeVisible();
});

test('next month is closed before the window', async ({ page }) => {
	await octoberCard(page, OCT_20);
	// Review Focus 1: no way in before the last 7 days.
	await page.goto('/card/next');
	await expect(page).toHaveURL(/\/card$/);
	await page.goto('/card/build?for=next');
	await expect(page).toHaveURL(/\/card$/);
	await page.goto('/card/build/habits?for=next');
	await expect(page).toHaveURL(/\/card$/);
});

test('on the 2nd last month is loggable, on the 4th it is not', async ({ page }) => {
	await octoberCard(page, '2026-10-01T12:00:00Z');
	await setClock(page, '2026-11-02T12:00:00Z');
	await page.goto('/today?day=2026-10-31');
	await waitForHydration(page);
	const link = page.getByRole('link', { name: 'Drink water', exact: true });
	const href = (await link.getAttribute('href'))!;
	await link.click();
	await page.getByLabel('Friday October 30, not logged').click();
	await page.getByRole('button', { name: 'Add one' }).click();
	await expect(page.getByLabel('Friday October 30, 1 logged')).toBeVisible();
	await setClock(page, '2026-11-04T12:00:00Z');
	expect((await page.goto(href))?.status()).toBe(404);
});
