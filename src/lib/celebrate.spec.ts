import { afterEach, describe, expect, it, vi } from 'vitest';
import { burst, tap } from './celebrate.ts';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('burst', () => {
	it('fires a small burst from the given point', async () => {
		const fire = vi.fn();
		await burst({ x: 0.5, y: 0.25 }, false, fire);
		expect(fire).toHaveBeenCalledTimes(1);
		expect(fire.mock.calls[0][0]).toMatchObject({ origin: { x: 0.5, y: 0.25 }, particleCount: 24 });
	});

	it('does nothing under reduced motion', async () => {
		const fire = vi.fn();
		await burst({ x: 0.5, y: 0.5 }, true, fire);
		expect(fire).not.toHaveBeenCalled();
	});
});

describe('tap', () => {
	it('vibrates where supported', () => {
		const vibrate = vi.fn();
		vi.stubGlobal('navigator', { vibrate });
		tap();
		expect(vibrate).toHaveBeenCalledWith(10);
	});

	it('is silent elsewhere', () => {
		vi.stubGlobal('navigator', {});
		expect(() => tap()).not.toThrow();
	});
});
