import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { getAuth } from '#lib/server/auth/index.ts';
import { checkAndRecordIp, IP_LIMITS, type IpScope } from '#lib/server/auth/ip-limit.ts';
import { actions as signinActions } from './signin/+page.server.ts';
import { actions as joinActions } from './join/[code]/+page.server.ts';
import { actions as resetActions } from './reset/[token]/+page.server.ts';

const test = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock('$app/env/private', () => ({
	GOOGLE_CLIENT_ID: undefined,
	GOOGLE_CLIENT_SECRET: undefined,
	IP_LIMIT_MULTIPLIER: undefined
}));
vi.mock('#lib/server/db/client.ts', () => ({ getDb: () => test.db }));
vi.mock('#lib/server/auth/index.ts', () => ({
	getAuth: vi.fn(() => {
		throw new Error('reached Better Auth');
	})
}));

const IP = '203.0.113.9';
const MESSAGE = 'Too many attempts. Try again in a few minutes.';

let db: Db;

beforeEach(async () => {
	db = await createTestDb();
	test.db = db;
	vi.mocked(getAuth).mockClear();
});

function event(path: string, body: Record<string, string>, params: Record<string, string> = {}) {
	return {
		request: new Request(`http://localhost${path}`, {
			method: 'POST',
			body: new URLSearchParams(body)
		}),
		locals: { user: null, session: null },
		params,
		cookies: { set: vi.fn(), delete: vi.fn(), get: vi.fn() },
		url: new URL(`http://localhost${path}`),
		getClientAddress: () => IP
	} as never;
}

async function useUp(scope: IpScope) {
	for (let i = 0; i < IP_LIMITS[scope]; i++) await checkAndRecordIp(db, scope, IP, new Date());
}

const cases = [
	{
		scope: 'signin' as const,
		run: () =>
			signinActions.signin(
				event('/signin?/signin', { username: 'zach', password: 'correct horse battery' })
			)
	},
	{
		scope: 'signup' as const,
		run: () =>
			joinActions.signup(
				event(
					'/join/CODE?/signup',
					{ username: 'zach', name: 'Zach', password: 'correct horse battery' },
					{ code: 'CODE' }
				)
			)
	},
	{
		scope: 'reset' as const,
		run: () =>
			resetActions.default(
				event('/reset/TOKEN', { newPassword: 'correct horse battery' }, { token: 'TOKEN' })
			)
	}
];

describe('per-IP limits on the auth form actions', () => {
	it.each(cases)('$scope: a blocked IP gets 429 and never reaches Better Auth', async (c) => {
		await useUp(c.scope);
		const result = await c.run();
		expect(result).toMatchObject({ status: 429, data: { errors: { form: MESSAGE } } });
		expect(Object.keys((result as { data: { errors: object } }).data.errors)).toEqual(['form']);
		expect(getAuth).not.toHaveBeenCalled();
	});

	it.each(cases)('$scope: an IP under the limit reaches Better Auth', async (c) => {
		await expect(c.run()).rejects.toThrow('reached Better Auth');
	});
});
