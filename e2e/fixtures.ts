import type { Page } from '@playwright/test';

/** Waits for the page to hydrate, so enhanced forms do not fall back to a native POST. */
export async function waitForHydration(page: Page): Promise<void> {
	await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
}

/** Signs in through the /signin form. */
export async function signIn(page: Page, username: string, password: string): Promise<void> {
	await page.goto('/signin');
	await waitForHydration(page);
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

/**
 * Signs up a brand-new member through /join/E2E-OPEN and finishes onboarding, leaving the page
 * signed in. Returns the username so tests can sign in again elsewhere.
 */
export async function newMember(page: Page): Promise<{ username: string; password: string }> {
	const username = uniqueUsername();
	const password = 'a long new password 1';
	await page.goto('/join/E2E-OPEN');
	await waitForHydration(page);
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Display name').fill('Habit Tester');
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await page.waitForURL(/\/onboarding$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: "Let's go" }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'));
	return { username, password };
}

/** `newMember` for a context with JavaScript disabled: plain form posts, no hydration to wait for. */
export async function newMemberWithoutJs(
	page: Page
): Promise<{ username: string; password: string }> {
	const username = uniqueUsername();
	const password = 'a long new password 1';
	await page.goto('/join/E2E-OPEN');
	await page.getByLabel('Username').fill(username);
	await page.getByLabel('Display name').fill('Habit Tester');
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await page.waitForURL(/\/onboarding$/);
	await page.getByRole('button', { name: "Let's go" }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'));
	return { username, password };
}

/**
 * `newMember`, then adds the first `count` Quick start suggestions (at most 10) to the habit
 * library, so a card can be built right away.
 */
export async function newMemberWithHabits(
	page: Page,
	count: number
): Promise<{ username: string; password: string }> {
	const member = await newMember(page);
	await page.goto('/me/habits?welcome=1');
	await waitForHydration(page);
	const labels = await page
		.getByRole('button', { name: /^Add / })
		.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
	for (const label of labels.slice(0, count)) {
		await page.getByRole('button', { name: label, exact: true }).click();
		await page.getByRole('button', { name: `${label.slice(4)} added`, exact: true }).waitFor();
	}
	return member;
}

/** A username no other test uses: `e2e_` and 8 random lowercase letters or digits. */
export function uniqueUsername(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return 'e2e_' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Moves the app's clock for this browser context (the E2E server honours the cookie). */
export async function setClock(page: Page, iso: string): Promise<void> {
	await page
		.context()
		.addCookies([{ name: 'hb_test_now', value: iso, url: 'http://localhost:4173' }]);
}

/** Builds and starts a 3×3 card from the first 8 habits through the builder UI. */
export async function buildAndStartCard(page: Page): Promise<void> {
	await page.goto('/card/build');
	await waitForHydration(page);
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: /3×3/ }) })
		.click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < 8; i++) await labels.nth(i).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/card\/build\/targets$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/card\/build\/rewards$/);
	await waitForHydration(page);
	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/card\/build\/board$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Start card' }).click();
	await page.waitForURL(/\/card\?started=1$/);
}
