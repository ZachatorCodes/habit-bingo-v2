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

/** A username no other test uses: `e2e_` and 8 random lowercase letters or digits. */
export function uniqueUsername(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return 'e2e_' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
