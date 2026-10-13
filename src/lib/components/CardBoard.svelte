<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CardSize } from '#lib/game/card-layout.ts';
	import type { SquareState } from '#lib/game/square-state.ts';
	import BingoSquare from './BingoSquare.svelte';

	type Props = {
		size: CardSize;
		/** `link`: the center square, which leads to next month's card (spec §3.5). */
		squares: {
			emoji: string;
			name: string;
			state: SquareState;
			/** 0–1, shown on earn squares in progress. */
			progress?: number;
			link?: boolean;
		}[];
	};

	let { size, squares }: Props = $props();
</script>

<!-- Every square shows its name; 5×5 squares are compact on phones (smaller emoji and text). -->
<div class="grid gap-1.5 sm:gap-2" style:grid-template-columns="repeat({size}, minmax(0, 1fr))">
	{#each squares as square, index (index)}
		{#if square.link}
			<a
				href={resolve('/(app)/card/next')}
				class="block rounded-square focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>
				<BingoSquare
					emoji={square.emoji}
					label={square.name}
					state={square.state}
					progress={square.progress}
					compact={size === 5}
				/>
			</a>
		{:else}
			<BingoSquare
				emoji={square.emoji}
				label={square.name}
				state={square.state}
				progress={square.progress}
				compact={size === 5}
			/>
		{/if}
	{/each}
</div>
