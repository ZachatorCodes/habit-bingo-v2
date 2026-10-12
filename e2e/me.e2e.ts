import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { signIn, uniqueUsername, waitForHydration } from './fixtures.ts';

const PASSWORD = 'a long new password 1';

/** A fresh, onboarded user from the open invite, signed in on `page` and looking at /me. */
async function newUser(page: Page): Promise<{ username: string }> {
	const username = uniqueUsername();
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Display name').fill('Me Tester');
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/onboarding$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: "Let's go" }).click();
	await expect(page).toHaveURL(/\/today$/);
	await page.goto('/me');
	await waitForHydration(page);
	return { username };
}

/** A second "device" carrying a copy of `a`'s cookies, already on /me. */
async function copyDevice(browser: Browser, a: BrowserContext): Promise<Page> {
	const b = await browser.newContext();
	await b.addCookies(await a.cookies());
	const pageB = await b.newPage();
	await pageB.goto('/me');
	await expect(pageB).toHaveURL(/\/me$/);
	return pageB;
}

test('the Me page shows the profile and no Google rows when Google is off', async ({ page }) => {
	const { username } = await newUser(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Me' })).toBeVisible();
	await expect(page.getByText(`@${username}`).first()).toBeVisible();
	await expect(page.getByLabel('Display name')).toHaveValue('Me Tester');
	await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
	const nav = page.getByRole('navigation', { name: 'Main' });
	await expect(nav.getByRole('link', { name: 'Me' })).toHaveAttribute('aria-current', 'page');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('the profile can be changed', async ({ page }) => {
	await newUser(page);
	await page.getByLabel('Display name').fill('  Renamed  ');
	await page.getByRole('radio', { name: '🐙' }).check({ force: true });
	await page.getByRole('button', { name: 'Save profile' }).click();
	await expect(page.getByText('Profile saved.')).toBeVisible();
	await page.reload();
	await expect(page.getByLabel('Display name')).toHaveValue('Renamed');
	await expect(page.locator('header')).toContainText('🐙');

	await page.getByLabel('Display name').fill(' ');
	await page.getByRole('button', { name: 'Save profile' }).click();
	const name = page.getByLabel('Display name');
	await expect(name).toHaveAccessibleDescription(/Enter a display name\./);
	await expect(name).toBeFocused();
});

test('settings show that week start applies from the next card', async ({ page }) => {
	await newUser(page);
	const weekStart = page.getByRole('radiogroup', { name: 'Week starts on' });
	await expect(weekStart).toHaveAccessibleDescription('Applies from your next card.');
	await page.getByLabel('Timezone').selectOption('Asia/Tokyo');
	await weekStart.getByRole('radio', { name: 'Sunday' }).check();
	await page.getByRole('button', { name: 'Save settings' }).click();
	await expect(page.getByText('Settings saved.')).toBeVisible();
	await page.reload();
	await expect(page.getByLabel('Timezone')).toHaveValue('Asia/Tokyo');
	await expect(weekStart.getByRole('radio', { name: 'Sunday' })).toBeChecked();
});

test('a breached-looking short password is rejected with the policy message', async ({ page }) => {
	await newUser(page);
	await page.getByLabel('Current password').fill(PASSWORD);
	await page.getByLabel('New password').fill('short');
	await page.getByRole('button', { name: 'Change password' }).click();
	const field = page.getByLabel('New password');
	await expect(field).toHaveAccessibleDescription(/Use at least 10 characters\./);
	await expect(field).toBeFocused();
	// Passwords are never echoed back.
	await expect(page.getByLabel('Current password')).toHaveValue('');
	await expect(field).toHaveValue('');
});

test('a wrong current password is reported on that field', async ({ page }) => {
	await newUser(page);
	await page.getByLabel('Current password').fill('not my password at all');
	await page.getByLabel('New password').fill('another long password 2');
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page.getByLabel('Current password')).toHaveAccessibleDescription(
		/That's not your current password\./
	);
});

test('changing the password signs out other devices', async ({ page, context, browser }) => {
	const { username } = await newUser(page);
	const pageB = await copyDevice(browser, context);

	await page.getByLabel('Current password').fill(PASSWORD);
	await page.getByLabel('New password').fill('another long password 2');
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page.getByText('Password changed. Other devices are signed out.')).toBeVisible();

	// This device stays signed in; the copied cookie is dead (Review Focus 4).
	await page.reload();
	await expect(page).toHaveURL(/\/me$/);
	await pageB.goto('/me');
	await expect(pageB).toHaveURL(/\/signin\?next=%2Fme$/);
	await pageB.context().close();

	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page).toHaveURL(/\/$/);
	await signIn(page, username, 'another long password 2');
	await expect(page).toHaveURL(/\/today$/);
});

test('sign out everywhere ends every session', async ({ page, context, browser }) => {
	await newUser(page);
	const pageB = await copyDevice(browser, context);

	await page.getByRole('button', { name: 'Sign out everywhere' }).click();
	await expect(page).toHaveURL(/\/signin$/);
	await page.goto('/me');
	await expect(page).toHaveURL(/\/signin\?next=%2Fme$/);
	await pageB.goto('/me');
	await expect(pageB).toHaveURL(/\/signin\?next=%2Fme$/);
	await pageB.context().close();
});

test('delete account requires typing the username and then signs you out', async ({
	page,
	context
}) => {
	const { username } = await newUser(page);
	const confirm = page.getByLabel('Type your username to confirm');

	await page.getByRole('button', { name: 'Delete my account' }).click();
	await expect(confirm).toHaveAccessibleDescription(/That doesn't match your username\./);
	await expect(confirm).toBeFocused();

	await confirm.fill('someone_else');
	await page.getByRole('button', { name: 'Delete my account' }).click();
	await expect(confirm).toHaveAccessibleDescription(/That doesn't match your username\./);
	await expect(page).toHaveURL(/\/me$/);

	await confirm.fill(username.toUpperCase());
	await page.getByRole('button', { name: 'Delete my account' }).click();
	await expect(page).toHaveURL(/\/$/);
	expect((await context.cookies()).some((c) => c.name.endsWith('hb.session_token'))).toBe(false);
	await page.goto('/me');
	await expect(page).toHaveURL(/\/signin/);

	await signIn(page, username, PASSWORD);
	await expect(page.getByRole('alert')).toHaveText(/Wrong username or password\./);
});

for (const action of [
	'profile',
	'settings',
	'changePassword',
	'setPassword',
	'linkGoogle',
	'unlinkGoogle',
	'signOutEverywhere',
	'deleteAccount'
]) {
	test(`signed-out posts to the ${action} action are sent to sign in`, async ({ request }) => {
		const response = await request.post(`/me?/${action}`, {
			form: { confirmUsername: 'e2e_member' },
			headers: { origin: 'http://localhost:4173', accept: 'text/html' },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
		expect(response.headers()['location']).toMatch(/^\/signin/);
	});
}

test('linking Google without Google configured is refused', async ({ page }) => {
	await newUser(page);
	const response = await page.request.post('/me?/linkGoogle', {
		form: {},
		headers: { origin: 'http://localhost:4173', accept: 'text/html' },
		maxRedirects: 0
	});
	expect(response.status()).toBe(404);
});
