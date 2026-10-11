export type PasswordProblem = 'tooShort' | 'tooLong' | 'sameAsUsername' | 'breached';

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_MESSAGES: Record<PasswordProblem, string> = {
	tooShort: 'Use at least 10 characters.',
	tooLong: 'Use at most 128 characters.',
	sameAsUsername: "Your password can't be your username.",
	breached: 'This password has appeared in a data breach. Choose a different one.'
};

/**
 * The first rule a password breaks, or null if it is acceptable. The breach lookup (a network
 * call) only runs once the local rules pass.
 */
export async function checkPassword(
	password: string,
	username: string | null,
	isPwned: (password: string) => Promise<boolean>
): Promise<PasswordProblem | null> {
	if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
	if (password.length > MAX_PASSWORD_LENGTH) return 'tooLong';
	if (username && password.toLowerCase() === username.toLowerCase()) return 'sameAsUsername';
	if (await isPwned(password)) return 'breached';
	return null;
}
