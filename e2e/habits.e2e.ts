import { expect, test, type Page } from '@playwright/test';
import { newMember, newMemberWithoutJs, waitForHydration } from './fixtures.ts';

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

/** Picks a radio by clicking its visible label, as a person would (the input itself is visually hidden). */
async function chooseRadio(page: Page, name: RegExp): Promise<void> {
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name }) })
		.click();
	await expect(page.getByRole('radio', { name })).toBeChecked();
}

async function addHabit(
	page: Page,
	habit: {
		emoji: string;
		name: string;
		category: RegExp;
		howMany: string;
		per: string;
		counting?: string;
	}
): Promise<void> {
	await page.goto('/me/habits/new');
	await waitForHydration(page);
	await page.getByRole('textbox', { name: 'Emoji' }).fill(habit.emoji);
	await page.getByRole('textbox', { name: 'Name' }).fill(habit.name);
	await chooseRadio(page, habit.category);
	await page.getByRole('spinbutton', { name: 'How many' }).fill(habit.howMany);
	await page.getByRole('combobox', { name: 'Per' }).selectOption(habit.per);
	if (habit.counting)
		await page.getByRole('combobox', { name: 'Counting' }).selectOption(habit.counting);
	await page.getByRole('button', { name: 'Add habit' }).click();
}

test('create a habit and see it in its category', async ({ page }) => {
	await newMember(page);
	await addHabit(page, {
		emoji: '🚴',
		name: 'Go biking',
		category: /Fitness/,
		howMany: '3',
		per: 'month',
		counting: 'times'
	});
	await expect(page).toHaveURL(/\/me\/habits\?category=fitness&created=1$/);
	await expect(page.getByRole('status')).toHaveText(/Habit added\./);
	const fitness = page.getByRole('region', { name: /Fitness/ });
	await expect(fitness.getByText('Go biking')).toBeVisible();
	await expect(fitness.getByText('3 times a month')).toBeVisible();
});

test('edit a habit and see the change', async ({ page }) => {
	await newMember(page);
	await addHabit(page, {
		emoji: '📚',
		name: 'Read',
		category: /Learning/,
		howMany: '1',
		per: 'month'
	});
	await page.getByRole('link', { name: 'Edit Read' }).click();
	await waitForHydration(page);
	await expect(page.getByText('Changes apply to cards you build from now on.')).toBeVisible();
	await page.getByRole('textbox', { name: 'Name' }).fill('Finish a book');
	await page.getByRole('button', { name: 'Save habit' }).click();
	await expect(page.getByRole('status')).toHaveText(/Habit saved\./);
	await expect(page.getByText('Finish a book')).toBeVisible();
	await expect(page.getByText('Once a month')).toBeVisible();
});

test('archive from the edit page, then restore from the archived view', async ({ page }) => {
	await newMember(page);
	await addHabit(page, {
		emoji: '🧘',
		name: 'Meditate',
		category: /Mind/,
		howMany: '2',
		per: 'week'
	});
	await page.getByRole('link', { name: 'Edit Meditate' }).click();
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Archive' }).click();
	await expect(page).toHaveURL(/\/me\/habits$/);
	await expect(page.getByText('No habits yet.')).toBeVisible();
	await page.getByRole('link', { name: 'Show archived (1)' }).click();
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Restore Meditate' }).click();
	await page.getByRole('link', { name: 'Show active habits' }).click();
	await expect(page.getByText('Meditate')).toBeVisible();
});

test('a limit per day posted without JS is rejected on the period field', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await newMemberWithoutJs(page);
	await page.goto('/me/habits/new');
	await page.getByRole('textbox', { name: 'Emoji' }).fill('🍔');
	await page.getByRole('textbox', { name: 'Name' }).fill('Eat out');
	await chooseRadio(page, /Limit it/);
	await page.getByRole('combobox', { name: 'Per' }).selectOption('day');
	await page.getByRole('button', { name: 'Add habit' }).click();
	await expect(page.getByRole('combobox', { name: 'Per' })).toHaveAccessibleDescription(
		/Limits can be per week or per month\./
	);
	await page.goto('/me/habits');
	await expect(page.getByText('No habits yet.')).toBeVisible();
	await context.close();
});

test('the form works without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await newMemberWithoutJs(page);
	await page.goto('/me/habits/new');
	await page.getByRole('textbox', { name: 'Emoji' }).fill('💧');
	await page.getByRole('textbox', { name: 'Name' }).fill('Drink water');
	await chooseRadio(page, /Health/);
	await page.getByRole('spinbutton', { name: 'How many' }).fill('8');
	await page.getByRole('combobox', { name: 'Per' }).selectOption('day');
	await page.getByRole('button', { name: 'Add habit' }).click();
	await expect(page).toHaveURL(/\/me\/habits\?category=health&created=1$/);
	await expect(page.getByText('8 times a day')).toBeVisible();
	await context.close();
});

test("someone else's habit is a 404", async ({ browser }) => {
	const a = await browser.newContext();
	const pageA = await a.newPage();
	await newMember(pageA);
	await addHabit(pageA, {
		emoji: '🎸',
		name: 'Guitar',
		category: /Creative/,
		howMany: '3',
		per: 'week'
	});
	await pageA.getByRole('link', { name: 'Edit Guitar' }).click();
	await pageA.waitForURL(/\/me\/habits\/[0-9a-f-]{36}$/);
	const habitUrl = pageA.url();

	const b = await browser.newContext();
	const pageB = await b.newPage();
	await newMember(pageB);
	const view = await pageB.goto(habitUrl);
	expect(view?.status()).toBe(404);
	const origin = new URL(habitUrl).origin;
	for (const action of ['save', 'archive']) {
		const post = await pageB.request.post(`${habitUrl}?/${action}`, {
			form: {
				emoji: '🎸',
				name: 'Mine',
				category: 'creative',
				direction: 'atLeast',
				period: 'week',
				countMode: 'days',
				target: '1'
			},
			headers: { origin }
		});
		expect(post.status()).toBe(404);
	}
	await pageA.goto('/me/habits');
	await expect(pageA.getByText('Guitar')).toBeVisible();
	await a.close();
	await b.close();
});

test('after onboarding, new members land on Quick start and can add a starter', async ({
	page
}) => {
	await newMember(page);
	await expect(page).toHaveURL(/\/me\/habits\?welcome=1$/);
	await waitForHydration(page);
	await expect(page.getByText('Welcome! Start your habit library.')).toBeVisible();
	await page.getByRole('button', { name: 'Add Meditate' }).click();
	await expect(page.getByRole('button', { name: 'Meditate added' })).toBeDisabled();
	await expect(page.getByRole('region', { name: /Mind/ }).getByText('Meditate')).toBeVisible();
	await page.getByRole('link', { name: /Continue to Today/ }).click();
	await expect(page).toHaveURL(/\/today$/);
});

test('double-tapping a starter adds it once', async ({ page }) => {
	await newMember(page);
	await waitForHydration(page);
	const bike = page.getByRole('button', { name: 'Add Go biking' });
	await bike.dblclick();
	await expect(page.getByRole('button', { name: 'Go biking added' })).toBeDisabled();
	await page.goto('/me/habits?category=fitness');
	await expect(page.getByRole('region', { name: /Fitness/ }).getByRole('listitem')).toHaveCount(1);
});

test('two posts of the same starter add it once', async ({ page }) => {
	await newMember(page);
	const origin = new URL(page.url()).origin;
	const post = () =>
		page.request.post('/me/habits?/addStarter', {
			form: { starterId: 'water' },
			headers: { origin }
		});
	await Promise.all([post(), post()]);
	await page.goto('/me/habits?category=health');
	await expect(page.getByRole('region', { name: /Health/ }).getByRole('listitem')).toHaveCount(1);
});

test('archiving while filtered keeps the filter', async ({ page }) => {
	await newMember(page);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Add Go biking' }).click();
	await page.getByRole('button', { name: 'Add Meditate' }).click();
	await expect(page.getByRole('button', { name: 'Meditate added' })).toBeDisabled();
	await page.goto('/me/habits?category=fitness');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Archive Go biking' }).click();
	await expect(page.getByText('No habits in Fitness yet.')).toBeVisible();
	await expect(page.getByRole('link', { name: /Fitness/ })).toHaveAttribute('aria-current', 'true');
});
