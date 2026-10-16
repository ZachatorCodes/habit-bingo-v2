import type { CategoryId } from '#lib/game/categories.ts';

export const ICONS = [
	{ name: 'barbell', label: 'Barbell', group: 'fitness' },
	{ name: 'person-simple-run', label: 'Run', group: 'fitness' },
	{ name: 'bicycle', label: 'Bicycle', group: 'fitness' },
	{ name: 'swimming-pool', label: 'Swim', group: 'fitness' },
	{ name: 'sneaker-move', label: 'Sneakers', group: 'fitness' },
	{ name: 'mountains', label: 'Mountains', group: 'fitness' },
	{ name: 'soccer-ball', label: 'Soccer', group: 'fitness' },
	{ name: 'basketball', label: 'Basketball', group: 'fitness' },
	{ name: 'drop', label: 'Drop', group: 'health' },
	{ name: 'carrot', label: 'Carrot', group: 'health' },
	{ name: 'pill', label: 'Medicine', group: 'health' },
	{ name: 'tooth', label: 'Tooth', group: 'health' },
	{ name: 'bed', label: 'Bed', group: 'health' },
	{ name: 'moon', label: 'Moon', group: 'health' },
	{ name: 'wine', label: 'Wine glass', group: 'health' },
	{ name: 'cigarette', label: 'Cigarette', group: 'health' },
	{ name: 'coffee', label: 'Coffee', group: 'health' },
	{ name: 'fork-knife', label: 'Meal', group: 'health' },
	{ name: 'hamburger', label: 'Burger', group: 'health' },
	{ name: 'heartbeat', label: 'Heart rate', group: 'health' },
	{ name: 'leaf', label: 'Leaf', group: 'mind' },
	{ name: 'brain', label: 'Brain', group: 'mind' },
	{ name: 'flower-lotus', label: 'Lotus', group: 'mind' },
	{ name: 'sun-horizon', label: 'Sunrise', group: 'mind' },
	{ name: 'smiley', label: 'Smile', group: 'mind' },
	{ name: 'notebook', label: 'Notebook', group: 'mind' },
	{ name: 'sun', label: 'Sun', group: 'mind' },
	{ name: 'broom', label: 'Broom', group: 'home' },
	{ name: 'sparkle', label: 'Sparkle', group: 'home' },
	{ name: 'cat', label: 'Cat', group: 'home' },
	{ name: 'dog', label: 'Dog', group: 'home' },
	{ name: 'plant', label: 'Seedling', group: 'home' },
	{ name: 'washing-machine', label: 'Laundry', group: 'home' },
	{ name: 'trash', label: 'Trash can', group: 'home' },
	{ name: 'house', label: 'House', group: 'home' },
	{ name: 'phone', label: 'Phone', group: 'social' },
	{ name: 'users-three', label: 'Group', group: 'social' },
	{ name: 'chat-circle', label: 'Chat', group: 'social' },
	{ name: 'envelope', label: 'Envelope', group: 'social' },
	{ name: 'heart', label: 'Heart', group: 'social' },
	{ name: 'gift', label: 'Gift', group: 'social' },
	{ name: 'book-open', label: 'Book', group: 'learning' },
	{ name: 'graduation-cap', label: 'Study', group: 'learning' },
	{ name: 'translate', label: 'Translate', group: 'learning' },
	{ name: 'code', label: 'Code', group: 'learning' },
	{ name: 'pencil-simple', label: 'Pencil', group: 'learning' },
	{ name: 'lightbulb', label: 'Lightbulb', group: 'learning' },
	{ name: 'paint-brush', label: 'Paintbrush', group: 'creative' },
	{ name: 'music-notes', label: 'Music', group: 'creative' },
	{ name: 'camera', label: 'Camera', group: 'creative' },
	{ name: 'guitar', label: 'Guitar', group: 'creative' },
	{ name: 'palette', label: 'Palette', group: 'creative' },
	{ name: 'pen-nib', label: 'Pen', group: 'creative' },
	{ name: 'piggy-bank', label: 'Piggy bank', group: 'money' },
	{ name: 'wallet', label: 'Wallet', group: 'money' },
	{ name: 'coins', label: 'Coins', group: 'money' },
	{ name: 'shopping-cart', label: 'Shopping', group: 'money' },
	{ name: 'receipt', label: 'Receipt', group: 'money' },
	{ name: 'chart-line-up', label: 'Growth', group: 'money' },
	{ name: 'star', label: 'Star', group: 'other' },
	{ name: 'alarm', label: 'Alarm clock', group: 'other' },
	{ name: 'target', label: 'Target', group: 'other' },
	{ name: 'trophy', label: 'Trophy', group: 'other' },
	{ name: 'rocket', label: 'Rocket', group: 'other' },
	{ name: 'cactus', label: 'Cactus', group: 'other' },
	{ name: 'flower', label: 'Flower', group: 'other' },
	{ name: 'pizza', label: 'Pizza', group: 'other' },
	{ name: 'grid-nine', label: 'Grid', group: 'other' },
	{ name: 'user-circle', label: 'Person', group: 'other' },
	{ name: 'shield-check', label: 'Shield', group: 'other' },
	{ name: 'lock', label: 'Private', group: 'other' }
] as const satisfies readonly { name: string; label: string; group: CategoryId }[];

export type IconName = (typeof ICONS)[number]['name'];

const NAMES: ReadonlySet<string> = new Set(ICONS.map((icon) => icon.name));

/** Icons a user may choose for a habit or group; `lock` is reserved for private squares. */
export function isPickableIcon(value: string): value is IconName {
	return value !== 'lock' && isIconName(value);
}

export function isIconName(value: string): value is IconName {
	return NAMES.has(value);
}

export const CATEGORY_ICON: Record<CategoryId, IconName> = {
	fitness: 'barbell',
	health: 'heartbeat',
	mind: 'brain',
	home: 'house',
	social: 'users-three',
	learning: 'graduation-cap',
	creative: 'palette',
	money: 'piggy-bank',
	other: 'sparkle'
};

export const AVATAR_ICONS: readonly IconName[] = [
	'smiley',
	'cat',
	'dog',
	'flower-lotus',
	'leaf',
	'sun',
	'moon',
	'star',
	'plant',
	'mountains',
	'coffee',
	'music-notes',
	'rocket',
	'cactus',
	'flower',
	'pizza',
	'soccer-ball',
	'basketball',
	'guitar',
	'palette',
	'heart',
	'trophy',
	'book-open',
	'bicycle'
];

export const DEFAULT_AVATAR_ICON = 'smiley' satisfies IconName;
export const FALLBACK_ICON = 'sparkle' satisfies IconName;
