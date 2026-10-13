<script lang="ts">
	import type { SquareState } from '#lib/game/square-state.ts';

	type Props = {
		emoji: string;
		label: string;
		state: SquareState;
		/** 0..1, shown for inProgress squares. */
		progress?: number;
		/** Show the name under the emoji (default). Today's rows show it beside the square instead. */
		showLabel?: boolean;
		/** A 5×5 card on a phone: smaller emoji, name in small text on up to 2 lines. */
		compact?: boolean;
	};

	let { emoji, label, state, progress = 0, showLabel = true, compact = false }: Props = $props();

	const percent = $derived(Math.round(Math.min(Math.max(progress, 0), 1) * 100));

	const stateText = $derived(
		{
			empty: 'not started',
			inProgress: `in progress, ${percent}%`,
			complete: 'complete',
			held: 'protected',
			atRisk: 'at risk',
			lost: 'lost',
			free: 'free',
			buildNext: "build next month's card"
		}[state]
	);

	// States never rely on colour alone (spec §4): each has its own border style too.
	const styles: Record<SquareState, string> = {
		empty: 'border-2 border-solid border-line bg-white shadow-[0_3px_0_var(--color-line)]',
		inProgress: 'border-2 border-solid border-line bg-white shadow-[0_3px_0_var(--color-line)]',
		complete:
			'border-[3px] border-solid border-earn-edge bg-earn shadow-[0_3px_0_var(--color-earn-shadow)]',
		held: 'border-2 border-solid border-protect-edge bg-protect shadow-[0_3px_0_var(--color-protect-shadow)]',
		atRisk:
			'border-2 border-dashed border-risk-edge bg-risk shadow-[0_3px_0_var(--color-risk-shadow)]',
		lost: 'border-2 border-solid border-line bg-lost opacity-70',
		free: 'border-2 border-solid border-ink bg-ink text-risk shadow-[0_3px_0_#000]',
		buildNext: 'border-2 border-dotted border-ink bg-white shadow-[0_3px_0_var(--color-line)]'
	};
</script>

<div
	role="img"
	aria-label="{label}: {stateText}"
	data-state={state}
	class={[
		'relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-square p-1 text-center font-bold text-ink',
		styles[state]
	]}
>
	{#if state === 'free'}
		<span aria-hidden="true" class="text-sm font-black tracking-wide">FREE</span>
	{:else}
		<span aria-hidden="true" class={[compact ? 'text-lg sm:text-2xl' : 'text-2xl', 'leading-none']}
			>{emoji}</span
		>
		{#if showLabel}
			<span
				data-label
				aria-hidden="true"
				class={[
					'line-clamp-2 w-full font-extrabold break-words',
					compact
						? 'text-[10px] leading-[1.1] sm:text-xs sm:leading-tight'
						: 'text-xs leading-tight',
					state === 'lost' && 'line-through'
				]}>{label}</span
			>
		{/if}
	{/if}

	{#if state === 'inProgress'}
		<div
			role="progressbar"
			aria-valuenow={percent}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-hidden="true"
			class="absolute right-1.5 bottom-1.5 left-1.5 h-1 overflow-hidden rounded-full bg-line"
		>
			<div class="h-full rounded-full bg-accent" style:width="{percent}%"></div>
		</div>
	{/if}
</div>
