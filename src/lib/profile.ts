/** The avatars people can pick from. */
export const AVATAR_EMOJI = [
	'🙂',
	'😎',
	'🤓',
	'🥳',
	'😺',
	'🐶',
	'🦊',
	'🐼',
	'🐸',
	'🐵',
	'🦄',
	'🐙',
	'🌵',
	'🌻',
	'🍀',
	'🍉',
	'🍕',
	'🍩',
	'⚽',
	'🏀',
	'🎸',
	'🎨',
	'🚀',
	'⭐'
] as const;

export type WeekStart = 'monday' | 'sunday';

/** True for IANA zone names the runtime knows, plus `UTC`. */
export function isValidTimezone(tz: string): boolean {
	return tz === 'UTC' || Intl.supportedValuesOf('timeZone').includes(tz);
}
