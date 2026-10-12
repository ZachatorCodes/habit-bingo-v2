<script lang="ts">
	import type { SquareState } from '#lib/game/square-state.ts';

	type Props = {
		emoji: string;
		label: string;
		state: SquareState;
		/** 0..1, shown for inProgress squares. */
		progress?: number;
		showLabel?: boolean;
	};

	let { emoji, label, state, progress = 0, showLabel = false }: Props = $props();

	const percent = $derived(Math.round(Math.min(Math.max(progress, 0), 1) * 100));

	const stateText = $derived(
		{
			empty: 'not started',
			inProgress: `in progress, ${percent}%`,
			complete: 'complete',
			held: 'protected',
			atRisk: 'at risk',
			lost: 'lost',
			free: 'free'
		}[state]
	);

	const markers: Partial<Record<SquareState, string>> = {
		complete: '✓',
		held: '🛡',
		atRisk: '⚠',
		lost: '✗'
	};

	const styles: Record<SquareState, string> = {
		empty: 'bg-white border-line shadow-[0_3px_0_var(--color-line)]',
		inProgress: 'bg-white border-line shadow-[0_3px_0_var(--color-line)]',
		complete: 'bg-earn border-earn-edge shadow-[0_3px_0_var(--color-earn-shadow)]',
		held: 'bg-protect border-protect-edge shadow-[0_3px_0_var(--color-protect-shadow)]',
		atRisk: 'bg-risk border-risk-edge shadow-[0_3px_0_var(--color-risk-shadow)]',
		lost: 'bg-lost border-line opacity-70',
		free: 'bg-ink border-ink text-risk shadow-[0_3px_0_#000]'
	};
</script>

<div
	role="img"
	aria-label="{label}: {stateText}"
	data-state={state}
	class={[
		'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-square border-2 p-1 text-center font-bold text-ink',
		styles[state]
	]}
>
	{#if state === 'free'}
		<span aria-hidden="true" class="text-sm font-black tracking-wide">FREE</span>
	{:else}
		<span aria-hidden="true" class="text-2xl leading-none">{emoji}</span>
		{#if showLabel}
			<span
				data-label
				aria-hidden="true"
				class={['text-xs leading-tight', state === 'lost' && 'line-through']}>{label}</span
			>
		{/if}
	{/if}

	{#if markers[state]}
		<span aria-hidden="true" class="absolute top-1 right-1.5 text-xs leading-none"
			>{markers[state]}</span
		>
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
