import { expect, test } from '@playwright/test';
import { newMember, waitForHydration } from './fixtures.ts';

test('the library starts empty with a way to add a habit', async ({ page }) => {
	await newMember(page);
	await page.goto('/me/habits');
	await expect(page.getByRole('heading', { level: 1, name: 'Habit library' })).toBeVisible();
	await expect(page.getByText('No habits yet.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'New habit' }).first()).toHaveAttribute(
		'href',
		'/me/habits/new'
	);
});

test('an empty category filter says so', async ({ page }) => {
	await newMember(page);
	await page.goto('/me/habits?category=mind');
	await expect(page.getByText('No habits in Mind yet.')).toBeVisible();
	await expect(page.getByRole('link', { name: /Mind/ })).toHaveAttribute('aria-current', 'true');
});

test('Me links to the habit library', async ({ page }) => {
	await newMember(page);
	await page.goto('/me');
	await waitForHydration(page);
	await page.getByRole('link', { name: /Habit library/ }).click();
	await expect(page).toHaveURL(/\/me\/habits$/);
});

test('signed-out visitors are sent to sign in', async ({ page }) => {
	await page.goto('/me/habits');
	await expect(page).toHaveURL(/\/signin\?next=%2Fme%2Fhabits$/);
});

test('archive and restore posts for an unknown id are 404', async ({ page }) => {
	await newMember(page);
	for (const action of ['archive', 'restore']) {
		const response = await page.request.post(`/me/habits?/${action}`, {
			form: { id: 'not-a-real-id' },
			headers: { origin: new URL(page.url()).origin }
		});
		expect(response.status()).toBe(404);
	}
});
