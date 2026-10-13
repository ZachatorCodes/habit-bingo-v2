import { expect, test, type Browser, type Page } from '@playwright/test';
import { newMember, newMemberWithHabits, setClock, waitForHydration } from './fixtures.ts';

// The first 8 Quick start habits: Finish a book, Go biking, Call an old friend (anytime this
// month); Meditate, Power clean (2 days a week); Scoop the litter box (every day); Drink water
// (8 a day); Eat out (a slip). The card starts on Thursday Oct 15; "today" is Tuesday Oct 20.
const OCT_15 = '2026-10-15T12:00:00Z';
const OCT_20 = '2026-10-20T12:00:00Z';

async function startCard(page: Page): Promise<void> {
	await page.goto('/card/build');
	await expect(page).toHaveURL(/\/card\/build\/size$/);
	await waitForHydration(page);
	await page
		.locator('label')
		.filter({ has: page.getByRole('radio', { name: /3×3/ }) })
		.click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/habits$/);
	await waitForHydration(page);
	const labels = page.locator('label').filter({ has: page.getByRole('checkbox') });
	for (let i = 0; i < 8; i++) await labels.nth(i).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/targets$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/rewards$/);
	await waitForHydration(page);
	await page.getByLabel('First bingo').fill('Ice cream');
	await page.getByLabel('5 squares').fill('Movie night');
	await page.getByLabel('Blackout').fill('A weekend away');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/card\/build\/board$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Start card' }).click();
	await expect(page).toHaveURL(/\/card\?started=1$/);
}

/** A member whose card started Oct 15, looking at Today on Oct 20. */
async function onToday(page: Page): Promise<void> {
	await newMemberWithHabits(page, 8);
	await setClock(page, OCT_15);
	await startCard(page);
	await setClock(page, OCT_20);
	await page.goto('/today');
	await waitForHydration(page);
}

const section = (page: Page, name: string) =>
	page.getByRole('region', { name }).getByRole('listitem');

test('a new card fills the Today sections', async ({ page }) => {
	await onToday(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
	await expect(section(page, 'Do today')).toHaveCount(4);
	await expect(section(page, 'Anytime this month')).toHaveCount(3);
	await expect(section(page, 'Log a slip')).toHaveCount(1);
	await expect(section(page, 'Do today').filter({ hasText: 'Drink water' })).toContainText(
		'0/8 today'
	);
	await expect(page.getByRole('link', { name: 'See your October card' })).toBeVisible();
});

test('logging moves a day habit to Done and back with undo', async ({ page }) => {
	await onToday(page);
	await page.getByRole('button', { name: 'Log Scoop the litter box' }).click();
	const done = page.getByRole('group', { name: /Done/ });
	await expect(page.getByText('Done (1)')).toBeVisible();
	await page.getByText('Done (1)').click();
	await expect(done.getByText('1/1 today')).toBeVisible();
	await page.getByRole('button', { name: 'Undo one Scoop the litter box' }).click();
	await expect(section(page, 'Do today').filter({ hasText: 'Scoop the litter box' })).toContainText(
		'0/1 today'
	);
});

test('earlier days are reachable and logging there counts', async ({ page }) => {
	await onToday(page);
	await page
		.getByRole('navigation', { name: 'Day' })
		.getByRole('link', { name: 'Yesterday' })
		.click();
	await expect(page).toHaveURL(/\/today\?day=2026-10-19$/);
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(page).toHaveURL(/\/today\?day=2026-10-19$/);
	await expect(section(page, 'Do today').filter({ hasText: 'Drink water' })).toContainText(
		'1/8 on Monday'
	);
});

test('the 4th day back is not offered and a forged post is refused', async ({ page, baseURL }) => {
	await onToday(page);
	const days = page.getByRole('navigation', { name: 'Day' }).getByRole('link');
	await expect(days).toHaveText(['Today', 'Yesterday', 'Sunday', 'Saturday']);
	await page.goto('/today?day=2026-10-16');
	await expect(
		page.getByRole('navigation', { name: 'Day' }).getByRole('link', { name: 'Today' })
	).toHaveAttribute('aria-current', 'date');

	const squareId = await page.locator('input[name="squareId"]').first().inputValue();
	const response = await page.request.post('/today?/log', {
		headers: { origin: baseURL! },
		form: { squareId, date: '2026-10-16' }
	});
	expect(response.status()).toBe(400);
	const foreign = await page.request.post('/today?/log', {
		headers: { origin: baseURL! },
		form: { squareId: 'not-a-square', date: '2026-10-20' }
	});
	expect(foreign.status()).toBe(404);
});

test('all done today', async ({ page }) => {
	await onToday(page);
	await page.getByRole('button', { name: 'Log Scoop the litter box' }).click();
	for (let i = 0; i < 8; i++) {
		await page.getByRole('button', { name: 'Log Drink water' }).click();
		// The 8th moves it to Done.
		if (i < 7) await expect(page.getByText(`${i + 1}/8 today`)).toBeVisible();
	}
	// Week habits need 2 days: today and yesterday.
	for (const name of ['Meditate', 'Power clean']) {
		await page.getByRole('button', { name: `Log ${name}` }).click();
		await expect(page.getByText('1 of 2 this week').first()).toBeVisible();
	}
	await page.goto('/today?day=2026-10-19');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Log Meditate' }).click();
	await expect(page.getByText(/Done \(1\)/)).toBeVisible();
	await page.getByRole('button', { name: 'Log Power clean' }).click();
	await expect(page.getByText(/Done \(2\)/)).toBeVisible();
	await page.goto('/today');
	await expect(page.getByText('All done today 🎉')).toBeVisible();
});

test('no card yet', async ({ page }) => {
	await newMember(page);
	await page.goto('/today');
	await expect(page.getByText('No card yet.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Build one' })).toBeVisible();
});

async function withoutJs(browser: Browser, page: Page): Promise<Page> {
	const context = await browser.newContext({ javaScriptEnabled: false });
	await context.addCookies(await page.context().cookies());
	return context.newPage();
}

test('Today works without JavaScript', async ({ page, browser }) => {
	await onToday(page);
	const noJs = await withoutJs(browser, page);
	await noJs.goto('/today');
	await noJs.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(noJs.getByText('1/8 today')).toBeVisible();
	await noJs.getByRole('button', { name: 'Undo one Drink water' }).click();
	await expect(noJs.getByText('0/8 today')).toBeVisible();
	await noJs.context().close();
});

test('logging updates instantly and survives a reload', async ({ page }) => {
	await onToday(page);
	// Hold the server's answer: the row must change before it arrives.
	let release = () => {};
	const held = new Promise<void>((resolve) => (release = resolve));
	const isLog = (url: URL) => url.pathname === '/today' && url.search.startsWith('?/log');
	await page.route(isLog, async (route) => {
		await held;
		await route.continue();
	});
	const water = section(page, 'Do today').filter({ hasText: 'Drink water' });
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(water).toContainText('1/8 today');
	const answered = page.waitForResponse((response) => isLog(new URL(response.url())));
	release();
	await answered;
	await page.unroute(isLog);
	await page.reload();
	await expect(section(page, 'Do today').filter({ hasText: 'Drink water' })).toContainText(
		'1/8 today'
	);
});

test('a refused log rolls back with a message', async ({ page }) => {
	await onToday(page);
	await page.goto('/today?day=2026-10-17');
	await waitForHydration(page);
	// Two days later Oct 17 is outside the window, but this page still offers it.
	await setClock(page, '2026-10-22T12:00:00Z');
	const water = section(page, 'Do today').filter({ hasText: 'Drink water' });
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(page.getByRole('status')).toContainText(
		'You can only log today and the 3 days before.'
	);
	await expect(water).toContainText('0/8 on Saturday');
});

test('reduced motion: no confetti canvas', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await onToday(page);
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(page.getByText('1/8 today')).toBeVisible();
	await expect(page.locator('body > canvas')).toHaveCount(0);
});

test('a log bursts confetti', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await onToday(page);
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(page.locator('body > canvas')).toHaveCount(1);
});

test('the optimistic view follows the row after several taps', async ({ page }) => {
	await onToday(page);
	const biking = section(page, 'Anytime this month').filter({ hasText: 'Go biking' });
	// Each log is answered (and the page reloaded) before the next tap.
	for (const text of ['1 of 2 this month', '2 of 2 this month']) {
		const logged = page.waitForResponse((r) => r.url().includes('/today/__data.json'));
		await page.getByRole('button', { name: 'Log Go biking' }).click();
		await logged;
		await expect(biking).toContainText(text);
	}
	// Go biking is 3 a month, prorated to 2 for a card started Oct 15. Hold the undo: the row must show one less than now, not what it was when − first appeared.
	let release = () => {};
	const held = new Promise<void>((resolve) => (release = resolve));
	const isUnlog = (url: URL) => url.pathname === '/today' && url.search.startsWith('?/unlog');
	await page.route(isUnlog, async (route) => {
		await held;
		await route.continue();
	});
	const undo = page.getByRole('button', { name: 'Undo one Go biking' });
	await undo.click();
	await expect(biking).toContainText('1 of 2 this month');
	const answered = page.waitForResponse((response) => isUnlog(new URL(response.url())));
	release();
	await answered;
	await page.unroute(isUnlog);
	await expect(biking).toContainText('1 of 2 this month');
});

test('undoing to zero keeps keyboard focus in the row', async ({ page }) => {
	await onToday(page);
	await page.getByRole('button', { name: 'Log Drink water' }).click();
	await expect(page.getByText('1/8 today')).toBeVisible();
	await page.getByRole('button', { name: 'Undo one Drink water' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByText('0/8 today')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Log Drink water' })).toBeFocused();
});

test('logging and undoing keep the scroll position', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 500 });
	await onToday(page);
	const slip = page.getByRole('button', { name: 'Log Eat out' });
	await slip.scrollIntoViewIfNeeded();
	const before = await page.evaluate(() => window.scrollY);
	expect(before).toBeGreaterThan(100);
	// Measure before the next click: Playwright scrolls a target into view before clicking it.
	const logged = page.waitForResponse((r) => r.url().includes('/today/__data.json'));
	await slip.click();
	await logged;
	await expect(section(page, 'Log a slip')).toContainText('1 of');
	expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(40);
	const undone = page.waitForResponse((r) => r.url().includes('/today/__data.json'));
	await page.getByRole('button', { name: 'Undo one Eat out' }).click();
	await undone;
	await expect(section(page, 'Log a slip')).toContainText('0 of');
	expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(40);
});
