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
	await newMemberWithHabits(page, 8);
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await expect(page.getByRole('list', { name: 'Card builder steps' })).toBeVisible();
	await expect(page.getByText('You have 8 habits / need 8')).toBeVisible();
	await expect(page.getByText('Add 16 more in the next step.')).toBeVisible();
	await waitForHydration(page);

	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Pick a size\./);
	await expect(page.getByRole('radiogroup', { name: 'Card size' })).toHaveAccessibleDescription(
		/Pick a size\./
	);

	const checkIcons = page
		.locator('label')
		.filter({ has: page.getByRole('radio') })
		.locator('svg');
	await expect(checkIcons.first()).toBeHidden();
	await chooseSize(page, /3×3/);
	// The chosen size shows a check, not only a colour.
	await expect(checkIcons.filter({ visible: true })).toHaveCount(1);
	await expect(page.locator('label').filter({ hasText: '3×3' }).locator('svg')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await expect(page.getByRole('heading', { name: 'Pick your habits' })).toBeVisible();
	await expect(page.getByText('0 of 8 picked')).toBeVisible();
	await waitForHydration(page);

	await pickHabits(page, 8);
	await expect(page.getByText('8 of 8 picked')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await expect(page.getByRole('link', { name: 'Habits' })).toBeVisible();

	// Progress is saved: coming back later resumes at the first open step.
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await page.goto('/card/build/habits');
	await expect(page.getByText('8 of 8 picked')).toBeVisible();
});

test('picking the wrong number of habits explains the count', async ({ page }) => {
	await newMemberWithHabits(page, 8);
	await startAtHabits(page);
	await pickHabits(page, 7);
	await expect(page.getByText('7 of 8 picked')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Pick exactly 8 habits\./);
	await expect(page.getByRole('group', { name: 'Your habits' })).toHaveAccessibleDescription(
		/Pick exactly 8 habits\./
	);
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await expect(page.getByText('7 of 8 picked')).toBeVisible();
});

test('a habit created inline is picked', async ({ page }) => {
	await newMemberWithHabits(page, 3);
	await startAtHabits(page);
	await page.getByText('New habit', { exact: true }).click();
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: 'Target', exact: true }) })
		.click();
	await page.getByRole('textbox', { name: 'Name' }).fill('Stretch daily');
	await page.getByRole('button', { name: 'Add habit' }).click();
	await expect(page.getByRole('checkbox', { name: /Stretch daily/ })).toBeChecked();
	await expect(page.getByText('1 of 8 picked')).toBeVisible();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
});

test("another person's habit id is refused", async ({ browser, page }) => {
	await newMemberWithHabits(page, 8);
	const other = await browser.newContext();
	const otherPage = await other.newPage();
	await newMemberWithHabits(otherPage, 8);
	await startAtHabits(otherPage);
	const foreign = await otherPage
		.getByRole('checkbox')
		.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
	expect(foreign).toHaveLength(8);

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

async function startAtTargets(page: Page): Promise<void> {
	await startAtHabits(page);
	await pickHabits(page, 8);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await waitForHydration(page);
}

test('targets show the days left and accept an override', async ({ page }) => {
	await newMemberWithHabits(page, 8);
	await startAtTargets(page);
	await expect(page.getByRole('heading', { name: /\d+ days? left in \w+/ })).toBeVisible();
	const first = page.getByRole('spinbutton').first();
	await first.fill('2');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/rewards$/);

	// The override is saved with the draft.
	await page.goto('/card/build/targets');
	await expect(page.getByRole('spinbutton').first()).toHaveValue('2');
});

test('an out-of-range target is explained on that row', async ({ page }) => {
	await newMemberWithHabits(page, 8);
	await startAtTargets(page);
	const first = page.getByRole('spinbutton').first();
	await first.fill('0');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await expect(page.getByText(/Pick a number from 1 to \d+\./)).toBeVisible();
	await expect(first).toHaveAttribute('aria-invalid', 'true');
	await expect(first).toHaveAccessibleDescription(/Pick a number from 1 to \d+\./);
	// What was typed is kept.
	await expect(first).toHaveValue('0');
});

test('rewards are required', async ({ page }) => {
	await newMemberWithHabits(page, 8);
	await startAtTargets(page);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/rewards$/);
	await waitForHydration(page);
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByText('Write a reward (up to 80 characters).')).toBeVisible();
	await expect(page.getByLabel('First bingo')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByLabel('Blackout')).toHaveValue('A weekend away');

	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board$/);
});

test('a habit archived after picking sends the person back to Habits', async ({ page }) => {
	await newMemberWithHabits(page, 9);
	await startAtHabits(page);
	const name = (
		await page
			.locator('label')
			.filter({ has: page.getByRole('checkbox') })
			.first()
			.locator('.font-extrabold')
			.innerText()
	).trim();
	await pickHabits(page, 8);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);

	await page.goto('/me/habits');
	await waitForHydration(page);
	await page.getByRole('button', { name: `Archive ${name}`, exact: true }).click();
	await expect(page.getByRole('button', { name: `Archive ${name}`, exact: true })).toHaveCount(0);

	await page.goto('/card/build/targets');
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await page.goto('/card/build/rewards');
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
	await expect(page.getByText('7 of 8 picked')).toBeVisible();

	// Another habit takes its place and the builder carries on.
	const unpicked = page
		.locator('label')
		.filter({ has: page.getByRole('checkbox', { checked: false }) })
		.first();
	await unpicked.click();
	await expect(page.getByText('8 of 8 picked')).toBeVisible();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
});

test('later steps redirect back until earlier ones are done', async ({ page }) => {
	await newMemberWithHabits(page, 8);
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
