import { expect, test } from '@playwright/test';

// The E2E server runs without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
test('the Google button is hidden when Google is not configured', async ({ page }) => {
	await page.goto('/signin');
	await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
});

test('an invite error from Google shows a clear message', async ({ page }) => {
	await page.goto('/signin?error=INVITE_REQUIRED');
	await expect(page.getByRole('alert')).toHaveText(/You need an invite to join\./);
});

test('a lowercased invite error shows the same message', async ({ page }) => {
	await page.goto('/signin?error=invite_required&error_description=You+need+an+invite+to+join.');
	await expect(page.getByRole('alert')).toHaveText(/You need an invite to join\./);
});

test('any other Google error shows a generic message', async ({ page }) => {
	await page.goto('/signin?error=state_mismatch');
	await expect(page.getByRole('alert')).toHaveText(/Google sign-in didn't work\. Try again\./);
});

test('posting to the Google action without Google configured is refused', async ({ request }) => {
	const response = await request.post('/signin?/google', {
		form: { next: '/today' },
		headers: { origin: 'http://localhost:4173' },
		maxRedirects: 0
	});
	expect(response.status()).toBe(404);
});
