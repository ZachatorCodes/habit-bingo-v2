import type { CategoryId } from '#lib/game/categories.ts';

export const ICONS = [
	{ name: 'barbell', label: 'Barbell', group: 'fitness' },
	{ name: 'person-simple-run', label: 'Person simple run', group: 'fitness' },
	{ name: 'bicycle', label: 'Bicycle', group: 'fitness' },
	{ name: 'swimming-pool', label: 'Swimming pool', group: 'fitness' },
	{ name: 'sneaker-move', label: 'Sneaker move', group: 'fitness' },
	{ name: 'mountains', label: 'Mountains', group: 'fitness' },
	{ name: 'soccer-ball', label: 'Soccer ball', group: 'fitness' },
	{ name: 'basketball', label: 'Basketball', group: 'fitness' },
	{ name: 'drop', label: 'Drop', group: 'health' },
	{ name: 'carrot', label: 'Carrot', group: 'health' },
	{ name: 'pill', label: 'Pill', group: 'health' },
	{ name: 'tooth', label: 'Tooth', group: 'health' },
	{ name: 'bed', label: 'Bed', group: 'health' },
	{ name: 'moon', label: 'Moon', group: 'health' },
	{ name: 'wine', label: 'Wine', group: 'health' },
	{ name: 'cigarette', label: 'Cigarette', group: 'health' },
	{ name: 'coffee', label: 'Coffee', group: 'health' },
	{ name: 'fork-knife', label: 'Fork knife', group: 'health' },
	{ name: 'hamburger', label: 'Hamburger', group: 'health' },
	{ name: 'heartbeat', label: 'Heartbeat', group: 'health' },
	{ name: 'leaf', label: 'Leaf', group: 'mind' },
	{ name: 'brain', label: 'Brain', group: 'mind' },
	{ name: 'flower-lotus', label: 'Flower lotus', group: 'mind' },
	{ name: 'sun-horizon', label: 'Sun horizon', group: 'mind' },
	{ name: 'smiley', label: 'Smiley', group: 'mind' },
	{ name: 'notebook', label: 'Notebook', group: 'mind' },
	{ name: 'sun', label: 'Sun', group: 'mind' },
	{ name: 'broom', label: 'Broom', group: 'home' },
	{ name: 'sparkle', label: 'Sparkle', group: 'home' },
	{ name: 'cat', label: 'Cat', group: 'home' },
	{ name: 'dog', label: 'Dog', group: 'home' },
	{ name: 'plant', label: 'Plant', group: 'home' },
	{ name: 'washing-machine', label: 'Washing machine', group: 'home' },
	{ name: 'trash', label: 'Trash', group: 'home' },
	{ name: 'house', label: 'House', group: 'home' },
	{ name: 'phone', label: 'Phone', group: 'social' },
	{ name: 'users-three', label: 'Users three', group: 'social' },
	{ name: 'chat-circle', label: 'Chat circle', group: 'social' },
	{ name: 'envelope', label: 'Envelope', group: 'social' },
	{ name: 'heart', label: 'Heart', group: 'social' },
	{ name: 'gift', label: 'Gift', group: 'social' },
	{ name: 'book-open', label: 'Book open', group: 'learning' },
	{ name: 'graduation-cap', label: 'Graduation cap', group: 'learning' },
	{ name: 'translate', label: 'Translate', group: 'learning' },
	{ name: 'code', label: 'Code', group: 'learning' },
	{ name: 'pencil-simple', label: 'Pencil simple', group: 'learning' },
	{ name: 'lightbulb', label: 'Lightbulb', group: 'learning' },
	{ name: 'paint-brush', label: 'Paint brush', group: 'creative' },
	{ name: 'music-notes', label: 'Music notes', group: 'creative' },
	{ name: 'camera', label: 'Camera', group: 'creative' },
	{ name: 'guitar', label: 'Guitar', group: 'creative' },
	{ name: 'palette', label: 'Palette', group: 'creative' },
	{ name: 'pen-nib', label: 'Pen nib', group: 'creative' },
	{ name: 'piggy-bank', label: 'Piggy bank', group: 'money' },
	{ name: 'wallet', label: 'Wallet', group: 'money' },
	{ name: 'coins', label: 'Coins', group: 'money' },
	{ name: 'shopping-cart', label: 'Shopping cart', group: 'money' },
	{ name: 'receipt', label: 'Receipt', group: 'money' },
	{ name: 'chart-line-up', label: 'Chart line up', group: 'money' },
	{ name: 'star', label: 'Star', group: 'other' },
	{ name: 'alarm', label: 'Alarm', group: 'other' },
	{ name: 'target', label: 'Target', group: 'other' },
	{ name: 'trophy', label: 'Trophy', group: 'other' },
	{ name: 'rocket', label: 'Rocket', group: 'other' },
	{ name: 'cactus', label: 'Cactus', group: 'other' },
	{ name: 'flower', label: 'Flower', group: 'other' },
	{ name: 'pizza', label: 'Pizza', group: 'other' }
] as const satisfies readonly { name: string; label: string; group: CategoryId }[];

export type IconName = (typeof ICONS)[number]['name'];

const NAMES: ReadonlySet<string> = new Set(ICONS.map((icon) => icon.name));

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
