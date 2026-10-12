import { expect, test, type Browser, type Page } from '@playwright/test';
import { signIn, uniqueUsername, waitForHydration } from './fixtures.ts';

const ADMIN = { username: 'e2e_admin', password: 'e2e admin password 1' };
const MEMBER = { username: 'e2e_member', password: 'e2e member password 1' };
const PASSWORD = 'a long first password 1';

/** Joins through `inviteUrl` and finishes onboarding, ending on /today. */
async function join(page: Page, inviteUrl: string, username: string): Promise<void> {
	await page.goto(inviteUrl);
	await waitForHydration(page);
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Display name').fill('Reset Tester');
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/onboarding$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: "Let's go" }).click();
	await expect(page).toHaveURL(/\/today$/);
}

async function newPage(browser: Browser): Promise<Page> {
	return (await browser.newContext()).newPage();
}

async function openAdmin(page: Page): Promise<void> {
	await signIn(page, ADMIN.username, ADMIN.password);
	await expect(page).toHaveURL(/\/today$/);
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
	await expect(page).toHaveURL(/\/admin$/);
	await waitForHydration(page);
}

test('members cannot open the admin page', async ({ page, baseURL }) => {
	await signIn(page, MEMBER.username, MEMBER.password);
	await expect(page).toHaveURL(/\/today$/);
	await expect(
		page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' })
	).toHaveCount(0);

	const response = await page.goto('/admin');
	expect(response?.status()).toBe(404);

	// Layout guards do not protect actions: each action checks too.
	for (const action of ['createInvite', 'resetLink']) {
		const post = await page.request.post(`/admin?/${action}`, {
			headers: { origin: baseURL! },
			form: { expiresInDays: '7', maxUses: '1', username: MEMBER.username }
		});
		expect(post.status()).toBe(404);
	}
});

test('signed-out visitors are sent to sign in from the admin page', async ({ page }) => {
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/signin\?next=%2Fadmin$/);
});

test('an admin creates an invite that a new person can use', async ({ page, browser, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await openAdmin(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

	await expect(page.getByLabel('Expires in (days)')).toHaveValue('7');
	await expect(page.getByLabel('Max uses')).toHaveValue('1');
	await page.getByLabel('Expires in (days)').fill('31');
	await page.getByRole('button', { name: 'Create invite' }).click();
	await expect(page.getByLabel('Expires in (days)')).toHaveAccessibleDescription(
		/Choose between 1 and 30 days\./
	);

	await page.getByLabel('Expires in (days)').fill('3');
	await page.getByRole('button', { name: 'Create invite' }).click();
	const link = page.getByRole('textbox', { name: 'New invite link' });
	await expect(link).toHaveValue(/^http:\/\/localhost:4173\/join\/[A-Za-z0-9_-]{14}$/);
	const inviteUrl = await link.inputValue();
	const code = inviteUrl.split('/').pop()!;

	await page.getByRole('button', { name: 'Copy invite link' }).click();
	await expect(page.getByText('Copied.')).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(inviteUrl);

	const invites = page.getByRole('table', { name: 'Invites' });
	await expect(invites.getByRole('row', { name: new RegExp(code) })).toContainText('Active');
	await expect(invites.getByRole('row', { name: new RegExp(code) })).toContainText('0 of 1');

	const newcomer = await newPage(browser);
	await join(newcomer, inviteUrl, uniqueUsername());

	await page.reload();
	const row = page
		.getByRole('table', { name: 'Invites' })
		.getByRole('row', { name: new RegExp(code) });
	await expect(row).toContainText('Used up');
	await expect(row).toContainText('1 of 1');
});

test('an admin reset link lets a user set a new password and sign in', async ({
	page,
	browser
}) => {
	const username = uniqueUsername();
	const oldDevice = await newPage(browser);
	await join(oldDevice, '/join/E2E-OPEN', username);

	await openAdmin(page);
	await page.getByLabel('Username').fill('nobody_here_' + username.slice(4, 8));
	await page.getByRole('button', { name: 'Create reset link' }).click();
	await expect(page.getByLabel('Username')).toHaveAccessibleDescription(
		/No user with that username\./
	);

	await page.getByLabel('Username').fill('@' + username.toUpperCase());
	await page.getByRole('button', { name: 'Create reset link' }).click();
	const link = page.getByRole('textbox', { name: 'Reset link' });
	await expect(link).toHaveValue(/^http:\/\/localhost:4173\/reset\/[A-Za-z0-9_-]{43}$/);
	await expect(
		page.getByText('Send this link to them yourself. It works once, for 24 hours.')
	).toBeVisible();
	const resetUrl = await link.inputValue();

	// Shown once: it is gone after a reload.
	await page.reload();
	await expect(page.getByRole('textbox', { name: 'Reset link' })).toHaveCount(0);

	const visitor = await newPage(browser);
	const response = await visitor.goto(resetUrl);
	expect(response?.headers()['cache-control']).toBe('no-store');
	expect(response?.headers()['referrer-policy']).toBe('strict-origin');
	await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
	await waitForHydration(visitor);

	await visitor.getByLabel('New password').fill(username);
	await visitor.getByRole('button', { name: 'Set new password' }).click();
	await expect(visitor.getByLabel('New password')).toHaveAccessibleDescription(
		/Your password can't be your username\./
	);

	const newPassword = 'a long second password 2';
	await visitor.getByLabel('New password').fill(newPassword);
	await visitor.getByRole('button', { name: 'Set new password' }).click();
	await expect(visitor).toHaveURL(/\/signin/);
	await expect(
		visitor.getByText('Password updated. Sign in with your new password.')
	).toBeVisible();

	// Every session the user had is gone.
	await oldDevice.goto('/today');
	await expect(oldDevice).toHaveURL(/\/signin/);

	await signIn(visitor, username, PASSWORD);
	await expect(visitor.getByText('Wrong username or password.')).toBeVisible();
	await signIn(visitor, username, newPassword);
	await expect(visitor).toHaveURL(/\/today$/);

	// Single use.
	await visitor.goto(resetUrl);
	await expect(
		visitor.getByRole('heading', { name: 'This reset link has already been used.' })
	).toBeVisible();
	await expect(visitor.getByLabel('New password')).toHaveCount(0);
});

test('an unknown reset link shows a friendly page and no form', async ({ page }) => {
	const response = await page.goto('/reset/not-a-real-token');
	expect(response?.status()).toBe(200);
	await expect(
		page.getByRole('heading', { name: "We couldn't find that reset link." })
	).toBeVisible();
	await expect(page.getByLabel('New password')).toHaveCount(0);
});

/** Signs in as the admin in a browser context with JavaScript off. */
async function noJsAdmin(browser: Browser): Promise<Page> {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/signin');
	await page.getByLabel('Username').fill(ADMIN.username);
	await page.getByLabel('Password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/today$/);
	return page;
}

test('admin forms work without JavaScript', async ({ browser }) => {
	const username = uniqueUsername();
	await join(await newPage(browser), '/join/E2E-OPEN', username);
	const page = await noJsAdmin(browser);

	await page.goto('/admin');
	await page.getByRole('button', { name: 'Create invite' }).click();
	await expect(page.getByRole('textbox', { name: 'New invite link' })).toHaveValue(/\/join\//);

	await page.getByLabel('Expires in (days)').fill('0');
	await page.getByRole('button', { name: 'Create invite' }).click();
	await expect(page.getByLabel('Expires in (days)')).toHaveAccessibleDescription(
		/Choose between 1 and 30 days\./
	);

	await page.getByLabel('Username').fill(username);
	const [response] = await Promise.all([
		page.waitForResponse((r) => r.request().method() === 'POST'),
		page.getByRole('button', { name: 'Create reset link' }).click()
	]);
	expect(response.headers()['cache-control']).toBe('private, no-store');
	await expect(page.getByRole('textbox', { name: 'Reset link' })).toHaveValue(
		/\/reset\/[A-Za-z0-9_-]{43}$/
	);
});

// Pins the reset page's `strict-origin` policy: with `no-referrer`, Chrome sends `Origin: null` on
// a no-JS form POST and SvelteKit's CSRF check answers 403.
test('the reset form works without JavaScript', async ({ browser }) => {
	const username = uniqueUsername();
	await join(await newPage(browser), '/join/E2E-OPEN', username);
	const admin = await noJsAdmin(browser);
	await admin.goto('/admin');
	await admin.getByLabel('Username').fill(username);
	await admin.getByRole('button', { name: 'Create reset link' }).click();
	const resetUrl = await admin.getByRole('textbox', { name: 'Reset link' }).inputValue();

	const visitor = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
	const page = await visitor.goto(resetUrl);
	expect(page?.headers()['cache-control']).toBe('no-store');
	expect(page?.headers()['referrer-policy']).toBe('strict-origin');
	await visitor.getByLabel('New password').fill('short');
	const [response] = await Promise.all([
		visitor.waitForResponse((r) => r.request().method() === 'POST'),
		visitor.getByRole('button', { name: 'Set new password' }).click()
	]);
	expect(response.status()).toBe(400);
	expect(response.headers()['cache-control']).toBe('no-store');
	expect(response.headers()['referrer-policy']).toBe('strict-origin');
	await expect(visitor.getByLabel('New password')).toHaveAccessibleDescription(
		/Use at least 10 characters\./
	);
});

test('changing a password on Me retires outstanding reset links', async ({ page, browser }) => {
	const username = uniqueUsername();
	const user = await newPage(browser);
	await join(user, '/join/E2E-OPEN', username);

	await openAdmin(page);
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Create reset link' }).click();
	const resetUrl = await page.getByRole('textbox', { name: 'Reset link' }).inputValue();

	await user.goto('/me');
	await waitForHydration(user);
	await user.getByLabel('Current password').fill(PASSWORD);
	await user.getByLabel('New password').fill('a long changed password 3');
	await user.getByRole('button', { name: 'Change password' }).click();
	await expect(user.getByText('Password changed.')).toBeVisible();

	await user.goto(resetUrl);
	await expect(
		user.getByRole('heading', { name: 'This reset link has already been used.' })
	).toBeVisible();
});
