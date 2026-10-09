import { describe, expect, it, vi } from 'vitest';
import { toAppError } from './errors';

describe('toAppError', () => {
	it('logs the real error with an id and returns a generic message with the same id', () => {
		const log = vi.fn();
		const result = toAppError(new Error('db exploded'), '/today', log, () => 'id-1');
		expect(result).toEqual({ message: 'Something went wrong.', errorId: 'id-1' });
		expect(log).toHaveBeenCalledWith({
			level: 'error',
			errorId: 'id-1',
			path: '/today',
			message: 'db exploded'
		});
	});

	it('never leaks the internal message to the user', () => {
		const result = toAppError(
			new Error('password=hunter2'),
			'/',
			() => {},
			() => 'id-2'
		);
		expect(JSON.stringify(result)).not.toContain('hunter2');
	});

	it('handles thrown values that are not Error objects', () => {
		const log = vi.fn();
		toAppError('plain string', '/x', log, () => 'id-3');
		expect(log).toHaveBeenCalledWith(expect.objectContaining({ message: 'plain string' }));
	});
});
