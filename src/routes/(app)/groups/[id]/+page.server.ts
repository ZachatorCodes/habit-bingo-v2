import { error, redirect } from '@sveltejs/kit';
import { TEST_CLOCK } from '$app/env/private';
import { requireUser } from '#lib/server/auth/guards.ts';
import { requestNow } from '#lib/server/clock.ts';
import { getDb } from '#lib/server/db/client.ts';
import {
	getMembership,
	leaveGroup,
	listMembers,
	removeMember,
	resetInvite
} from '#lib/server/groups.ts';
import { groupBoard } from '#lib/server/leaderboard.ts';
import type { Actions, PageServerLoad } from './$types';

function database() {
	const db = getDb();
	if (!db) error(503, 'Groups are not available right now.');
	return db;
}

export const load: PageServerLoad = async ({ locals, cookies, params, url }) => {
	const user = requireUser(locals);
	const db = database();
	const now = requestNow(cookies, TEST_CLOCK);
	const membership = await getMembership(db, user.id, params.id, now);
	if (!membership) error(404, 'Not found');
	const tab = url.searchParams.get('tab') === 'members' ? 'members' : 'leaderboard';
	const board = url.searchParams.get('board') === 'all' ? 'all' : 'month';
	const members = await listMembers(db, params.id);
	const leaderboard = await groupBoard(db, user.id, params.id, board, now);
	if (!leaderboard) error(404, 'Not found');
	const heir = members.find((m) => m.userId !== user.id);
	return {
		group: membership.group,
		isOwner: membership.role === 'owner',
		tab,
		board,
		members: members.map(({ userId, displayUsername, avatarIcon, role }) => ({
			userId,
			displayUsername: displayUsername ?? 'Someone',
			avatarIcon,
			role
		})),
		inviteLink: membership.inviteCode ? `${url.origin}/join/${membership.inviteCode}` : null,
		// Matches leaveGroup: the first other member by join order inherits.
		nextOwner: heir ? (heir.displayUsername ?? 'Someone') : null,
		// Always loaded: the group page shows both panes side by side at lg.
		leaderboard
	};
};

export const actions: Actions = {
	leave: async ({ locals, cookies, params }) => {
		const user = requireUser(locals);
		const db = database();
		if (!(await getMembership(db, user.id, params.id, requestNow(cookies, TEST_CLOCK))))
			error(404, 'Not found');
		const result = await leaveGroup(db, user.id, params.id, requestNow(cookies, TEST_CLOCK));
		if (!result) error(404, 'Not found');
		redirect(303, '/groups');
	},
	remove: async ({ locals, cookies, params, request }) => {
		const user = requireUser(locals);
		const db = database();
		if (!(await getMembership(db, user.id, params.id, requestNow(cookies, TEST_CLOCK))))
			error(404, 'Not found');
		const memberId = (await request.formData()).get('userId');
		if (typeof memberId !== 'string' || !(await removeMember(db, user.id, params.id, memberId)))
			error(404, 'Not found');
		redirect(303, `/groups/${params.id}?tab=members`);
	},
	reset: async ({ locals, cookies, params }) => {
		const user = requireUser(locals);
		const db = database();
		if (!(await getMembership(db, user.id, params.id, requestNow(cookies, TEST_CLOCK))))
			error(404, 'Not found');
		if (!(await resetInvite(db, user.id, params.id, requestNow(cookies, TEST_CLOCK))))
			error(404, 'Not found');
		redirect(303, `/groups/${params.id}?tab=members`);
	}
};
