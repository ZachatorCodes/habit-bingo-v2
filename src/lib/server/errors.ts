export type LogEntry = { level: 'error'; errorId: string; path: string; message: string };

/** Logs an unexpected error with a reference ID and returns a message that is safe to show.
 * SvelteKit fills in `status`. */
export function toAppError(
	error: unknown,
	path: string,
	log: (entry: LogEntry) => void,
	newId: () => string = () => crypto.randomUUID()
): Pick<App.Error, 'message' | 'errorId'> {
	const errorId = newId();
	const message = error instanceof Error ? error.message : String(error);
	log({ level: 'error', errorId, path, message });
	return { message: 'Something went wrong.', errorId };
}
