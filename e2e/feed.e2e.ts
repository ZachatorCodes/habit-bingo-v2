import { expect, test, type Browser, type Page } from '@playwright/test';
import {
	newMember,
	newMemberWithHabits,
	newMemberWithoutJs,
	setClock,
	startCard,
	waitForHydration
} from './fixtures.ts';

// "Finish a book" is monthly, so a single log completes it (and only monthly squares post).
const GOAL = 'Finish a book';

/** A creates "Climbers" and returns its path and invite link. */
async function createClimbers(page: Page): Promise<{ groupPath: string; link: string }> {
	await page.goto('/groups/new');
	await waitForHydration(page);
	await page.getByRole('textbox', { name: 'Name' }).fill('Climbers');
	await page.getByRole('button', { name: 'Create group' }).click();
	await expect(page.getByRole('heading', { level: 1, name: /Climbers/ })).toBeVisible();
	const groupPath = new URL(page.url()).pathname;
	await page.goto(`${groupPath}?tab=members`);
	return { groupPath, link: await page.getByRole('textbox', { name: 'Invite link' }).inputValue() };
}

async function joinFrom(browser: Browser, link: string, js = true) {
	const context = await browser.newContext({ javaScriptEnabled: js });
	const page = await context.newPage();
	const member = js ? await newMember(page) : await newMemberWithoutJs(page);
	await page.goto(link);
	if (js) await waitForHydration(page);
	await page.getByRole('button', { name: 'Join', exact: true }).click();
	await expect(page).toHaveURL(/\/groups\/[^/]+$/);
	return { page, member };
}

/** A starts a card, makes a group, and logs the monthly goal; B joins. */
async function setup(page: Page, browser: Browser, js = true) {
	const a = await newMemberWithHabits(page, 8);
	await setClock(page, '2026-10-20T12:00:00Z');
	await startCard(page);
	const { groupPath, link } = await createClimbers(page);
	await page.goto('/today');
	await waitForHydration(page);
	await page.getByRole('button', { name: `Log ${GOAL}` }).click();
	await expect(page.getByRole('button', { name: `Undo one ${GOAL}` })).toBeVisible();
	const b = await joinFrom(browser, link, js);
	return { a, groupPath, b };
}

test('a friend sees a highlight and reacts', async ({ page, browser }) => {
	const { a, groupPath, b } = await setup(page, browser);
	await expect(b.page.getByText(`@${a.username} completed ${GOAL}`)).toBeVisible();
	await b.page.getByRole('button', { name: 'React with heart, 0' }).first().click();
	await expect(
		b.page.getByRole('button', { name: 'React with heart, 1, you reacted' }).first()
	).toBeVisible();
	await page.goto(groupPath);
	await expect(page.getByRole('button', { name: 'React with heart, 1' }).first()).toBeVisible();
	await b.page.context().close();
});

test('undo removes the highlight', async ({ page, browser }) => {
	const { a, groupPath, b } = await setup(page, browser);
	await expect(b.page.getByText(`@${a.username} completed ${GOAL}`)).toBeVisible();
	await page.goto('/today');
	await waitForHydration(page);
	await page.getByRole('button', { name: `Undo one ${GOAL}` }).click();
	await expect(page.getByRole('button', { name: `Log ${GOAL}` })).toBeVisible();
	await b.page.goto(groupPath);
	await expect(b.page.getByText(`completed ${GOAL}`)).toHaveCount(0);
	await b.page.context().close();
});

test('reacting works without JavaScript', async ({ page, browser }) => {
	const { a, b } = await setup(page, browser, false);
	await expect(b.page.getByText(`@${a.username} completed ${GOAL}`)).toBeVisible();
	await b.page.getByRole('button', { name: 'React with fire, 0' }).first().click();
	await expect(
		b.page.getByRole('button', { name: 'React with fire, 1, you reacted' }).first()
	).toBeVisible();
	await b.page.context().close();
});

test('bad react posts are refused', async ({ page, browser }) => {
	const { b } = await setup(page, browser);
	const eventId = await b.page
		.locator('input[name="eventId"]')
		.first()
		.evaluate((el) => (el as HTMLInputElement).value);
	const url = `${b.page.url()}?/react`;
	const headers = { origin: new URL(b.page.url()).origin };
	const rocket = await b.page.request.post(url, { form: { eventId, icon: 'rocket' }, headers });
	expect(rocket.status()).toBe(400);
	const foreign = await b.page.request.post(url, {
		form: { eventId: 'not-an-event', icon: 'heart' },
		headers
	});
	expect(foreign.status()).toBe(404);
	await b.page.context().close();
});

test('feed is the main column on a computer', async ({ page }, info) => {
	test.skip(info.project.name !== 'desktop');
	await newMember(page);
	await page.setViewportSize({ width: 1280, height: 900 });
	const { groupPath } = await createClimbers(page);
	await page.goto(groupPath);
	const feed = (await page.getByRole('region', { name: 'Feed' }).boundingBox())!;
	const board = (await page.getByRole('region', { name: 'Leaderboard' }).boundingBox())!;
	expect(board.x).toBeGreaterThan(feed.x + feed.width - 1);
});

test('phone tabs start on Feed', async ({ page }, info) => {
	test.skip(info.project.name !== 'phone');
	await newMember(page);
	const { groupPath } = await createClimbers(page);
	await page.goto(groupPath);
	const tabs = page.getByRole('navigation', { name: 'Group' }).getByRole('link');
	await expect(tabs).toHaveText(['Feed', 'Leaderboard', 'Members']);
	await expect(tabs.first()).toHaveAttribute('aria-current', 'page');
});
