import type { CategoryId } from './categories.ts';
import type { HabitRule } from './habit-rules.ts';

export type Starter = {
	id: string;
	emoji: string;
	name: string;
	category: CategoryId;
	rule: HabitRule;
};

/** Tap-to-add suggestions shown after onboarding and in an empty library (spec §4.2). */
export const STARTERS: readonly Starter[] = [
	{
		id: 'read-book',
		emoji: '📚',
		name: 'Finish a book',
		category: 'learning',
		rule: { direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }
	},
	{
		id: 'bike',
		emoji: '🚴',
		name: 'Go biking',
		category: 'fitness',
		rule: { direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }
	},
	{
		id: 'meditate',
		emoji: '🧘',
		name: 'Meditate',
		category: 'mind',
		rule: { direction: 'atLeast', period: 'week', countMode: 'days', target: 2 }
	},
	{
		id: 'power-clean',
		emoji: '🧹',
		name: 'Power clean',
		category: 'home',
		rule: { direction: 'atLeast', period: 'week', countMode: 'days', target: 2 }
	},
	{
		id: 'litter',
		emoji: '🐈',
		name: 'Scoop the litter box',
		category: 'home',
		rule: { direction: 'atLeast', period: 'day', countMode: 'times', target: 1 }
	},
	{
		id: 'water',
		emoji: '💧',
		name: 'Drink water',
		category: 'health',
		rule: { direction: 'atLeast', period: 'day', countMode: 'times', target: 8 }
	},
	{
		id: 'call-friend',
		emoji: '📞',
		name: 'Call an old friend',
		category: 'social',
		rule: { direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }
	},
	{
		id: 'eat-out',
		emoji: '🍔',
		name: 'Eat out',
		category: 'money',
		rule: { direction: 'atMost', period: 'month', countMode: 'times', target: 10 }
	},
	{
		id: 'naps',
		emoji: '😴',
		name: 'Nap',
		category: 'health',
		rule: { direction: 'atMost', period: 'month', countMode: 'days', target: 3 }
	},
	{
		id: 'no-alcohol',
		emoji: '🍺',
		name: 'Alcohol',
		category: 'health',
		rule: { direction: 'atMost', period: 'month', countMode: 'days', target: 0 }
	}
];
