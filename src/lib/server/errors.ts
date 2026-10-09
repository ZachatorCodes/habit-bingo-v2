export type LogEntry = {
	level: 'error';
	errorId: string;
	path: string;
	message: string;
	stack?: string;
};

/** Logs an unexpected error with a reference ID and returns a message that is safe to show.
 * SvelteKit fills in `status`. */
export function toAppError(
	error: unknown,
	path: string,
	log: (entry: LogEntry) => void,
	newId: () => string = () => crypto.randomUUID()
): Pick<App.Error, 'message' | 'errorId'> {
	const errorId = newId();
	const entry: LogEntry = { level: 'error', errorId, path, message: String(error) };
	if (error instanceof Error) {
		entry.message = error.message;
		if (error.stack) entry.stack = error.stack;
	}
	log(entry);
	return { message: 'Something went wrong.', errorId };
}
