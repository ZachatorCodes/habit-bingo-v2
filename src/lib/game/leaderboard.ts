/**
 * Group leaderboard order (spec §3.9): points descending with competition ranks (1, 1, 3), then
 * people with no card (`points: null`, no rank) in input order. Array sort is stable, so ties and
 * the no-card rows keep input order.
 */
export function rankRows<T extends { points: number | null }>(
	rows: T[]
): (T & { rank: number | null })[] {
	const scored = rows.filter((r) => r.points !== null).sort((a, b) => b.points! - a.points!);
	// Competition rank: the first row with this many points sits at index + 1.
	const ranked = scored.map((r) => ({
		...r,
		rank: scored.findIndex((s) => s.points === r.points) + 1
	}));
	return [...ranked, ...rows.filter((r) => r.points === null).map((r) => ({ ...r, rank: null }))];
}
