<script lang="ts">
	import type { CardSize } from '#lib/game/card-layout.ts';
	import type { SquareState } from '#lib/game/square-state.ts';
	import BingoSquare from './BingoSquare.svelte';

	type Props = {
		size: CardSize;
		squares: { emoji: string; name: string; state: SquareState }[];
	};

	let { size, squares }: Props = $props();
</script>

<!-- Names show on a 3×3 card once there is room (sm and up); 5×5 squares stay emoji-only. -->
<div
	class="grid gap-2 max-sm:[&_[data-label]]:hidden"
	style:grid-template-columns="repeat({size}, minmax(0, 1fr))"
>
	{#each squares as square, index (index)}
		<BingoSquare
			emoji={square.emoji}
			label={square.name}
			state={square.state}
			showLabel={size === 3}
		/>
	{/each}
</div>
