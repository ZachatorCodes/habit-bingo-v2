import { expect, test, type Page } from '@playwright/test';
import { signIn, uniqueUsername, waitForHydration } from './fixtures.ts';

async function signUp(page: Page, displayName: string): Promise<void> {
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await page.getByLabel('Username').fill(uniqueUsername());
	await page.getByLabel('Display name').fill(displayName);
	await page.getByLabel('Password').fill('a long new password 1');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/onboarding$/);
	await waitForHydration(page);
}

test('a new sign-up completes onboarding and reaches Today', async ({ page }) => {
	await signUp(page, 'New Friend');

	// They already have a username, so it is not asked for again.
	await expect(page.getByLabel('Username')).toHaveCount(0);
	await expect(page.getByLabel('Display name')).toHaveValue('New Friend');

	await page.getByRole('radio', { name: '🦊' }).check({ force: true });
	await page.getByRole('button', { name: "Let's go" }).click();
	await expect(page).toHaveURL(/\/today$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();

	// Onboarded: the page is no longer reachable.
	await page.goto('/onboarding');
	await expect(page).toHaveURL(/\/today$/);
});

test('the browser timezone and week start are submitted', async ({ browser }) => {
	const context = await browser.newContext({ timezoneId: 'Pacific/Auckland', locale: 'en-US' });
	const page = await context.newPage();
	await signUp(page, 'Kiwi');
	await expect(page.locator('input[name="timezone"]')).toHaveValue('Pacific/Auckland');
	await expect(page.locator('input[name="weekStartsOn"]')).toHaveValue('sunday');
	await context.close();
});

test('an empty display name is reported and focused', async ({ page }) => {
	await signUp(page, 'Temp');
	await page.getByLabel('Display name').fill('   ');
	await page.getByRole('button', { name: "Let's go" }).click();
	const name = page.getByLabel('Display name');
	await expect(name).toHaveAccessibleDescription(/Enter a display name\./);
	await expect(name).toBeFocused();
	await expect(page).toHaveURL(/\/onboarding$/);
	await waitForHydration(page);
});

test('onboarding needs a session, and onboarded people skip it', async ({ page }) => {
	await page.goto('/onboarding');
	await expect(page).toHaveURL(/\/signin/);
	await signIn(page, 'e2e_member', 'e2e member password 1');
	await expect(page).toHaveURL(/\/today$/);
	await page.goto('/onboarding');
	await expect(page).toHaveURL(/\/today$/);
});

test('a browser timezone the server does not know falls back to UTC instead of blocking', async ({
	page
}) => {
	await signUp(page, 'Odd Zone');
	await page.locator('input[name="timezone"]').evaluate((el: HTMLInputElement) => {
		el.value = 'Mars/Olympus';
	});
	await page.getByRole('button', { name: "Let's go" }).click();
	await expect(page).toHaveURL(/\/today$/);
});
