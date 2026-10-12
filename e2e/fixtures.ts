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

/** A username no other test uses: `e2e_` and 8 random lowercase letters or digits. */
export function uniqueUsername(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return 'e2e_' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
