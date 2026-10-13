<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fullScreenConfetti } from '#lib/celebrate.ts';
	import type { Tier } from '#lib/game/score.ts';
	import type { Rewards } from '#lib/server/cards.ts';

	type Props = {
		/** Lines just completed (their squares ripple gold on the board). */
		lines: number[][];
		/** Reward tiers just reached: each reward is revealed. */
		tiers: Tier[];
		rewards: Rewards;
		sixtyThreshold: number;
		ondone: () => void;
		/** How long the banner stays when there is no reward to reveal. */
		duration?: number;
	};

	let { lines, tiers, rewards, sixtyThreshold, ondone, duration = 2500 }: Props = $props();

	let reveal = $state<HTMLDialogElement>();
	const revealId = $props.id();
	const earned = $derived(
		tiers.map((tier) =>
			tier === 'bingo'
				? { label: 'First bingo', reward: rewards.bingo }
				: tier === 'sixtyPercent'
					? { label: `${sixtyThreshold} squares`, reward: rewards.sixty }
					: { label: 'Blackout', reward: rewards.blackout }
		)
	);

	// The live region is in the page before its text, so screen readers announce "BINGO!".
	let announced = $state(false);
	// Focus returns here when the reward reveal closes.
	let opener: HTMLElement | null = null;
	function finish() {
		reveal?.close();
		opener?.focus();
		ondone();
	}

	// Line ripple (on the board) → BINGO! banner → confetti → the reward reveal (spec §4.7).
	onMount(() => {
		opener = document.activeElement as HTMLElement | null;
		const announce = setTimeout(() => (announced = true), 50);
		if (lines.length > 0) void fullScreenConfetti(prefersReducedMotion.current);
		if (earned.length > 0) {
			const timer = setTimeout(() => reveal?.showModal(), lines.length > 0 ? 900 : 0);
			return () => {
				clearTimeout(timer);
				clearTimeout(announce);
			};
		}
		const timer = setTimeout(ondone, duration);
		return () => {
			clearTimeout(timer);
			clearTimeout(announce);
		};
	});
</script>

<div role="status" class="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
	{#if announced && lines.length > 0}
		<p
			class="rounded-3xl border-4 border-ink bg-risk px-8 py-4 text-5xl font-black text-ink shadow-[0_6px_0_var(--color-ink)] motion-safe:animate-bounce"
		>
			BINGO!
		</p>
	{/if}
</div>

{#if earned.length > 0}
	<dialog
		bind:this={reveal}
		aria-labelledby={revealId}
		oncancel={(event) => {
			event.preventDefault();
			finish();
		}}
		class="m-auto max-w-sm rounded-3xl border-4 border-ink bg-cream p-6 text-center text-ink shadow-[0_6px_0_var(--color-ink)] backdrop:bg-ink/50"
	>
		<p class="text-5xl" aria-hidden="true">🎉</p>
		<h2 id={revealId} class="mt-2 text-2xl font-black">You earned a reward</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each earned as { label, reward } (label)}
				<li><span class="font-extrabold">{label}:</span> {reward}</li>
			{/each}
		</ul>
		<button
			type="button"
			onclick={finish}
			class="mt-5 rounded-2xl border-2 border-ink bg-accent px-5 py-2.5 font-extrabold shadow-[0_3px_0_var(--color-ink)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>Nice!</button
		>
	</dialog>
{/if}
