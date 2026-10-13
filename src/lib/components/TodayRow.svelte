<script lang="ts" module>
	import type { SquareState } from '#lib/game/square-state.ts';

	/** One habit on Today: its square, progress text, and that day's count. */
	export type TodayRowData = {
		squareId: string;
		emoji: string;
		name: string;
		state: SquareState;
		progress: number;
		text: string;
		count: number;
	};
</script>

<script lang="ts">
	import BingoSquare from './BingoSquare.svelte';

	type Props = {
		row: TodayRowData;
		/** The day being logged (YYYY-MM-DD). */
		day: string;
		/** The page's own query (e.g. "&day=2026-10-19"), carried through the form actions. */
		keep: string;
	};

	let { row, day, keep }: Props = $props();

	const button =
		'grid size-11 shrink-0 place-items-center rounded-2xl border-2 text-xl font-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
</script>

<li class="flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-2 pr-3">
	<div class="w-14 shrink-0">
		<BingoSquare emoji={row.emoji} label={row.name} state={row.state} progress={row.progress} />
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate font-extrabold">{row.name}</p>
		<p class="text-sm text-ink/75">{row.text}</p>
	</div>
	{#if row.count > 0}
		<form method="POST" action={`?/unlog${keep}`}>
			<input type="hidden" name="squareId" value={row.squareId} />
			<input type="hidden" name="date" value={day} />
			<button
				type="submit"
				aria-label="Undo one {row.name}"
				class={[button, 'border-line bg-white text-ink/75']}>−</button
			>
		</form>
	{/if}
	<form method="POST" action={`?/log${keep}`}>
		<input type="hidden" name="squareId" value={row.squareId} />
		<input type="hidden" name="date" value={day} />
		<button
			type="submit"
			aria-label="Log {row.name}"
			class={[button, 'border-ink bg-accent text-ink shadow-[0_3px_0_var(--color-ink)]']}>+</button
		>
	</form>
</li>
