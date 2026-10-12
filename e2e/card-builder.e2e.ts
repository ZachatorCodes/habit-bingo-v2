import { expect, test, type Page } from '@playwright/test';
import { newMember, newMemberWithHabits, waitForHydration } from './fixtures.ts';

/** Picks a size by clicking its visible label (the radio itself is visually hidden). */
async function chooseSize(page: Page, name: RegExp): Promise<void> {
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name }) })
		.click();
	await expect(page.getByRole('radio', { name })).toBeChecked();
}

/** Ticks the first `count` unticked habits by clicking their visible labels. */
async function pickHabits(page: Page, count: number): Promise<void> {
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < count; i++) await labels.nth(i).click();
}

async function startAtHabits(page: Page): Promise<void> {
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await waitForHydration(page);
	await chooseSize(page, /3×3/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
}

test('the builder starts at Size and moves to Habits', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await expect(page.getByRole('list', { name: 'Card builder steps' })).toBeVisible();
	await expect(page.getByText('You have 9 habits / need 9')).toBeVisible();
	await expect(page.getByText('Add 15 more in the next step.')).toBeVisible();
	await waitForHydration(page);

	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Pick a size\./);

	await chooseSize(page, /3×3/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await expect(page.getByRole('heading', { name: 'Pick your habits' })).toBeVisible();
	await expect(page.getByText('0 of 9 picked')).toBeVisible();
	await waitForHydration(page);

	await pickHabits(page, 9);
	await expect(page.getByText('9 of 9 picked')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await expect(page.getByRole('link', { name: 'Habits' })).toBeVisible();

	// Progress is saved: coming back later resumes at the first open step.
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await page.goto('/card/build/habits');
	await expect(page.getByText('9 of 9 picked')).toBeVisible();
});

test('picking the wrong number of habits explains the count', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await startAtHabits(page);
	await pickHabits(page, 8);
	await expect(page.getByText('8 of 9 picked')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Pick exactly 9 habits\./);
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await expect(page.getByText('8 of 9 picked')).toBeVisible();
});

test('a habit created inline is picked', async ({ page }) => {
	await newMemberWithHabits(page, 3);
	await startAtHabits(page);
	await page.getByText('New habit', { exact: true }).click();
	await page.getByRole('textbox', { name: 'Emoji' }).fill('🎯');
	await page.getByRole('textbox', { name: 'Name' }).fill('Stretch daily');
	await page.getByRole('button', { name: 'Add habit' }).click();
	await expect(page.getByRole('checkbox', { name: /Stretch daily/ })).toBeChecked();
	await expect(page.getByText('1 of 9 picked')).toBeVisible();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
});

test("another person's habit id is refused", async ({ browser, page }) => {
	await newMemberWithHabits(page, 9);
	const other = await browser.newContext();
	const otherPage = await other.newPage();
	await newMemberWithHabits(otherPage, 9);
	await startAtHabits(otherPage);
	const foreign = await otherPage
		.getByRole('checkbox')
		.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
	expect(foreign).toHaveLength(9);

	await startAtHabits(page);
	const response = await page.request.post('/card/build/habits?/habits', {
		// A repeated field, as the form sends it.
		data: new URLSearchParams(foreign.map((id) => ['habitIds', id])).toString(),
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			origin: new URL(page.url()).origin
		}
	});
	expect(response.status()).toBe(400);
	expect(await response.text()).toContain('Pick from your habits.');
	await other.close();
});

test('later steps redirect back until earlier ones are done', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await page.goto('/card/build/targets');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await waitForHydration(page);
	await chooseSize(page, /3×3/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await page.goto('/card/build/targets');
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
});

test('an unknown step is not found', async ({ page }) => {
	await newMember(page);
	const response = await page.goto('/card/build/nonsense');
	expect(response?.status()).toBe(404);
});

test('starting over forgets the builder progress', async ({ page }) => {
	await newMember(page);
	await page.goto('/card/build/size');
	await waitForHydration(page);
	await chooseSize(page, /5×5/);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Start over' }).click();
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await expect(page.getByRole('radio', { name: /5×5/ })).not.toBeChecked();
});

test('signed-out visitors are sent to sign in', async ({ page }) => {
	await page.goto('/card/build/size');
	await expect(page).toHaveURL(/\/signin\?next=%2Fcard%2Fbuild%2Fsize$/);
});
