import { describe, expect, it } from 'vitest';
import { isCategoryId } from './categories';
import { describeRule, isSingleEmoji, normalizeRule } from './habit-rules';
import { STARTERS } from './starters';

describe('STARTERS', () => {
	it('has exactly the ten starters, each a valid rule', () => {
		expect(STARTERS.map((s) => `${s.id} ${s.emoji} ${s.name} ${s.category}`)).toEqual([
			'read-book 📚 Finish a book learning',
			'bike 🚴 Go biking fitness',
			'meditate 🧘 Meditate mind',
			'power-clean 🧹 Power clean home',
			'litter 🐈 Scoop the litter box home',
			'water 💧 Drink water health',
			'call-friend 📞 Call an old friend social',
			'eat-out 🍔 Eat out money',
			'naps 😴 Nap health',
			'no-alcohol 🍺 Alcohol health'
		]);
		for (const starter of STARTERS) {
			expect(isSingleEmoji(starter.emoji)).toBe(true);
			expect(isCategoryId(starter.category)).toBe(true);
			expect(normalizeRule(starter.rule)).toEqual({ ok: true, rule: starter.rule });
		}
		expect(STARTERS.map((s) => describeRule(s.rule))).toEqual([
			'Once a month',
			'3 times a month',
			'2 days a week',
			'2 days a week',
			'Every day',
			'8 times a day',
			'Once a month',
			'At most 10 times a month',
			'At most 3 days a month',
			'None this month'
		]);
	});
});
