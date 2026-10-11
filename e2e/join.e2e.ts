import { expect, test } from '@playwright/test';
import { uniqueUsername, waitForHydration } from './fixtures.ts';

test('a valid invite lets a new person create an account and land on onboarding', async ({
	page,
	context
}) => {
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await expect(
		page.getByRole('heading', { level: 1, name: "You're invited to Habit Bingo" })
	).toBeVisible();
	await page.getByLabel('Username').fill(uniqueUsername());
	await page.getByLabel('Display name').fill('New Friend');
	await page.getByLabel('Password').fill('a long new password 1');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/onboarding$/);
	// Signed in, and the invite cookie is spent.
	const names = (await context.cookies()).map((c) => c.name);
	expect(names.some((name) => name.endsWith('hb.session_token'))).toBe(true);
	expect(names).not.toContain('hb_invite');
});

for (const [code, text] of [
	['E2E-EXPIRED', 'This invite has expired.'],
	['E2E-USED', 'This invite has already been used.'],
	['nope', "We couldn't find that invite."]
]) {
	test(`${code} shows a friendly message and no sign-up form`, async ({ page, context }) => {
		const response = await page.goto(`/join/${code}`);
		expect(response?.status()).toBe(200);
		await expect(page.getByText(text)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === 'hb_invite')).toBeUndefined();
	});
}

test('a valid invite sets the invite cookie', async ({ page, context }) => {
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	const cookie = (await context.cookies()).find((c) => c.name === 'hb_invite');
	expect(cookie).toMatchObject({ value: 'E2E-OPEN', httpOnly: true, sameSite: 'Lax', path: '/' });
});

test('a taken username keeps the form and the typed values', async ({ page }) => {
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await page.getByLabel('Username').fill('e2e_member');
	await page.getByLabel('Display name').fill('Copycat');
	await page.getByLabel('Password').fill('a long new password 1');
	await page.getByRole('button', { name: 'Create account' }).click();

	const username = page.getByLabel('Username');
	await expect(username).toHaveAccessibleDescription(/That username is taken\./);
	await expect(username).toHaveAttribute('aria-invalid', 'true');
	await expect(username).toHaveValue('e2e_member');
	await expect(page.getByLabel('Display name')).toHaveValue('Copycat');
	await expect(page).toHaveURL(/\/join\/E2E-OPEN$/);
});

test('every invalid field is reported at once and the first one gets focus', async ({ page }) => {
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await page.getByLabel('Username').fill('no spaces');
	await page.getByLabel('Password').fill('short');
	await page.getByRole('button', { name: 'Create account' }).click();

	const username = page.getByLabel('Username');
	await expect(username).toHaveAccessibleDescription(/Use 3–20 letters, numbers or underscores\./);
	await expect(username).toBeFocused();
	await expect(page.getByLabel('Display name')).toHaveAccessibleDescription(
		/Enter a display name\./
	);
	await expect(page.getByLabel('Password')).toHaveAccessibleDescription(
		/Use at least 10 characters\./
	);
});
