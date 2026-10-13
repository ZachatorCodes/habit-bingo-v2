import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The square states' border styles are their non-colour cue (spec §4), so each state's edge must
// stand out from the page and from its own fill: WCAG 1.4.11 non-text contrast, 3:1.
const css = readFileSync('src/routes/layout.css', 'utf8');
const token = (name: string) => {
	const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
	if (!match) throw new Error(`no --color-${name}`);
	return match[1];
};
const luminance = (hex: string) => {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

describe('square state borders', () => {
	it.each(['earn', 'protect', 'risk'])(
		'the %s edge stands out from the page and its fill',
		(state) => {
			expect(contrast(token(`${state}-edge`), token('cream'))).toBeGreaterThanOrEqual(3);
			expect(contrast(token(`${state}-edge`), token(state))).toBeGreaterThanOrEqual(3);
		}
	);
});
