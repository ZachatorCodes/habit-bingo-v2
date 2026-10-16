/** Habit rules from spec §3.2: which combinations exist, their ranges, defaults and wording. */

export type Direction = 'atLeast' | 'atMost';
export type Period = 'day' | 'week' | 'month';
export type CountMode = 'times' | 'days';
export type HabitRule = {
	direction: Direction;
	period: Period;
	countMode: CountMode;
	target: number;
};

type Range = { min: number; max: number };

const RANGES: Record<Direction, Record<Period, Record<CountMode, Range>>> = {
	atLeast: {
		// Per-day habits have no count mode choice: each day needs N check-ins.
		day: { times: { min: 1, max: 20 }, days: { min: 1, max: 20 } },
		week: { days: { min: 1, max: 7 }, times: { min: 1, max: 50 } },
		month: { days: { min: 1, max: 31 }, times: { min: 1, max: 100 } }
	},
	atMost: {
		// Check-ins cap at 20 a day, so a limit of 20 could never be broken; 0 a day is "None this month".
		day: { times: { min: 1, max: 19 }, days: { min: 1, max: 19 } },
		week: { days: { min: 0, max: 6 }, times: { min: 0, max: 50 } },
		month: { days: { min: 0, max: 30 }, times: { min: 0, max: 100 } }
	}
};

const DIRECTIONS: readonly string[] = ['atLeast', 'atMost'];
const PERIODS: readonly string[] = ['day', 'week', 'month'];
const COUNT_MODES: readonly string[] = ['times', 'days'];

/** The allowed target range for a combination. */
export function targetRange(direction: Direction, period: Period, countMode: CountMode): Range {
	return RANGES[direction][period][countMode];
}

export function defaultCountMode(direction: Direction): CountMode {
	return direction === 'atMost' ? 'times' : 'days';
}

type RuleField = 'direction' | 'period' | 'countMode' | 'target';

export function normalizeRule(input: {
	direction: string;
	period: string;
	countMode?: string;
	target: string | number;
}): { ok: true; rule: HabitRule } | { ok: false; field: RuleField; message: string } {
	if (!DIRECTIONS.includes(input.direction)) {
		return { ok: false, field: 'direction', message: 'Pick Do it or Limit it.' };
	}
	if (!PERIODS.includes(input.period)) {
		return { ok: false, field: 'period', message: 'Pick a day, a week or a month.' };
	}
	const direction = input.direction as Direction;
	const period = input.period as Period;

	let countMode: CountMode =
		input.countMode !== undefined && COUNT_MODES.includes(input.countMode)
			? (input.countMode as CountMode)
			: defaultCountMode(direction);
	if (period === 'day') countMode = 'times';

	const range = targetRange(direction, period, countMode);
	const target = parseTarget(input.target);
	if (target === null || target < range.min || target > range.max) {
		return {
			ok: false,
			field: 'target',
			message: `Pick a number from ${range.min} to ${range.max}.`
		};
	}
	return { ok: true, rule: { direction, period, countMode, target } };
}

function parseTarget(value: string | number): number | null {
	if (typeof value === 'string') {
		if (!/^\d+$/.test(value.trim())) return null;
		return Number(value.trim());
	}
	return Number.isInteger(value) ? value : null;
}

/** The plain-English sentence for a rule, e.g. "3 times a month" or "None this month". */
export function describeRule(rule: HabitRule): string {
	const { direction, period, countMode, target } = rule;
	if (direction === 'atMost') {
		if (target === 0) return `None this ${period}`;
		return `At most ${amount(target, countMode)} a ${period}`;
	}
	if (period === 'day' && target === 1) return 'Every day';
	const sentence = `${amount(target, countMode)} a ${period}`;
	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function amount(target: number, countMode: CountMode): string {
	if (target === 1) return 'once';
	return `${target} ${countMode}`;
}
