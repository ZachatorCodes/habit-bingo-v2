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

test('a limit per day can be added without JS', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await newMemberWithoutJs(page);
	await page.goto('/me/habits/new');
	await page.getByRole('textbox', { name: 'Emoji' }).fill('☕');
	await page.getByRole('textbox', { name: 'Name' }).fill('Coffee');
	await chooseRadio(page, /Limit it/);
	await page.getByRole('spinbutton', { name: 'How many' }).fill('1');
	await page.getByRole('combobox', { name: 'Per' }).selectOption('day');
	await page.getByRole('button', { name: 'Add habit' }).click();
	await expect(page).toHaveURL(/\/me\/habits\?category=other&created=1$/);
	await expect(page.getByText('At most once a day')).toBeVisible();
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
	// The error page still has its main landmark inside the signed-in area.
	await expect(pageB.getByRole('main')).toHaveCount(1);
	await expect(pageB.getByRole('main')).toContainText('Page not found');
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
	await page.getByRole('link', { name: /Build your first card/ }).click();
	await expect(page).toHaveURL(/\/card\/build\/size$/);
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

test('the habit form puts a small emoji box beside the name', async ({ page }) => {
	await newMember(page);
	await page.goto('/me/habits/new');
	const emoji = await page.getByRole('textbox', { name: 'Emoji' }).boundingBox();
	const name = await page.getByRole('textbox', { name: 'Name' }).boundingBox();
	const category = await page.getByRole('group', { name: 'Category' }).boundingBox();
	expect(emoji!.width).toBeLessThan(90);
	expect(Math.abs(emoji!.y - name!.y)).toBeLessThan(4);
	expect(name!.x).toBeGreaterThan(emoji!.x + emoji!.width);
	expect(category!.y).toBeLessThan(emoji!.y);
});

/** A member with "Go biking" archived, looking at the archived view. */
async function withArchivedBiking(page: Page): Promise<void> {
	await newMember(page);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Add Go biking' }).click();
	await expect(page.getByRole('button', { name: 'Go biking added' })).toBeDisabled();
	await page.goto('/me/habits');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Archive Go biking' }).click();
	await expect(page.getByRole('button', { name: 'Archive Go biking' })).toHaveCount(0);
	await page.goto('/me/habits?archived=1');
	await waitForHydration(page);
}

test('an archived habit can be deleted forever', async ({ page }) => {
	await withArchivedBiking(page);
	await page.getByRole('button', { name: 'Delete Go biking' }).click();
	const dialog = page.getByRole('dialog', { name: 'Delete Go biking forever?' });
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText("Your cards keep their copy of it. This can't be undone.");
	await dialog.getByRole('button', { name: 'Delete forever' }).click();
	await expect(page).toHaveURL(/\/me\/habits\?archived=1&deleted=1$/);
	await expect(page.getByText('Habit deleted.')).toBeVisible();
	await expect(page.getByText('Go biking')).toHaveCount(0);
});

test('cancelling keeps the habit', async ({ page }) => {
	await withArchivedBiking(page);
	await page.getByRole('button', { name: 'Delete Go biking' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.getByRole('button', { name: 'Restore Go biking' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Delete Go biking' })).toBeFocused();
});

test('deleting works without JavaScript', async ({ page, browser }) => {
	await withArchivedBiking(page);
	const context = await browser.newContext({ javaScriptEnabled: false });
	await context.addCookies(await page.context().cookies());
	const noJs = await context.newPage();
	await noJs.goto('/me/habits?archived=1');
	await noJs.getByRole('link', { name: 'Delete Go biking' }).click();
	await expect(noJs.getByRole('heading', { name: 'Delete Go biking forever?' })).toBeVisible();
	await noJs.getByRole('button', { name: 'Delete forever' }).click();
	await expect(noJs.getByText('Habit deleted.')).toBeVisible();
	await context.close();
});

test('only your own archived habits can be deleted', async ({ page, browser, baseURL }) => {
	await newMember(page);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Add Go biking' }).click();
	await expect(page.getByRole('button', { name: 'Go biking added' })).toBeDisabled();
	await page.goto('/me/habits');
	await page.getByRole('link', { name: 'Edit Go biking' }).click();
	await page.waitForURL(/\/me\/habits\/[0-9a-f-]{36}$/);
	const deleteUrl = `${page.url()}/delete`;
	// Active habits must be archived first.
	const active = await page.request.post(deleteUrl, { headers: { origin: baseURL! }, form: {} });
	expect(active.status()).toBe(400);
	// Someone else can't delete it, or even see the confirmation.
	const other = await (await browser.newContext()).newPage();
	await newMember(other);
	expect((await other.goto(deleteUrl))?.status()).toBe(404);
	const foreign = await other.request.post(deleteUrl, { headers: { origin: baseURL! }, form: {} });
	expect(foreign.status()).toBe(404);
});
