import { expect, test } from '@playwright/test';
import { newMember, uniqueUsername, waitForHydration } from './fixtures.ts';

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

test('a valid invite offers people who already have an account a way to sign in', async ({
	page
}) => {
	await page.goto('/join/E2E-OPEN');
	await expect(page.getByText('Already have an account?')).toBeVisible();
	await page.getByRole('link', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/signin\?next=%2Fjoin%2FE2E-OPEN$/);
});

test('a long group name fits a phone', async ({ page, browser }) => {
	const name = 'Z'.repeat(40);
	await newMember(page);
	await page.goto('/groups/new');
	await waitForHydration(page);
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: 'Mountains', exact: true }) })
		.click();
	await page.getByRole('textbox', { name: 'Name' }).fill(name);
	await page.getByRole('button', { name: 'Create group' }).click();
	await expect(page.getByRole('heading', { level: 1, name: new RegExp(name) })).toBeVisible();
	await page.goto(`${new URL(page.url()).pathname}?tab=members`);
	const link = await page.getByRole('textbox', { name: 'Invite link' }).inputValue();

	const other = await (
		await browser.newContext({ viewport: { width: 360, height: 740 } })
	).newPage();
	await newMember(other);
	await other.goto(link);
	await waitForHydration(other);
	await expect(other.getByRole('heading', { level: 1, name: `Join ${name}` })).toBeVisible();
	expect(await other.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	await other.context().close();

	// The owner is already a member, so the same link shows the "Open {name}" button.
	await page.setViewportSize({ width: 360, height: 740 });
	await page.goto(link);
	await expect(page.getByRole('link', { name: `Open ${name}` })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
