<script lang="ts">
	import { onMount } from 'svelte';
	import BingoSquare from './BingoSquare.svelte';
	import type { SquareState } from '#lib/game/square-state.ts';

	type Square = { emoji: string; label: string; state: SquareState; progress?: number };

	const start: Square[] = [
		{ emoji: '📚', label: 'Finish a book', state: 'inProgress', progress: 0.4 },
		{ emoji: '🚴', label: 'Bike 3×', state: 'inProgress', progress: 0.66 },
		{ emoji: '📞', label: 'Call an old friend', state: 'empty' },
		{ emoji: '🐈', label: 'Litter box daily', state: 'held' },
		{ emoji: '🍔', label: 'Eat out ≤ 10', state: 'atRisk' },
		{ emoji: '🧘', label: 'Meditate 2×/week', state: 'held' },
		{ emoji: '🧹', label: 'Power clean 2×/week', state: 'held' },
		{ emoji: '😴', label: 'Naps ≤ 3', state: 'lost' },
		{ emoji: '🌿', label: 'No weed', state: 'held' }
	];

	// Each step completes one square; the last one finishes the top row for a bingo.
	const steps: [index: number, state: SquareState][] = [
		[2, 'complete'],
		[1, 'complete'],
		[0, 'complete']
	];

	const fresh = () => start.map((square) => ({ ...square }));

	let squares = $state(fresh());
	let animating = $state(false);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		animating = true;
		let step = 0;
		const timer = setInterval(() => {
			if (step === steps.length) {
				squares = fresh();
				step = 0;
				return;
			}
			const [index, state] = steps[step++];
			squares[index] = { ...squares[index], state };
		}, 1500);
		return () => clearInterval(timer);
	});
</script>

<div
	data-testid="sample-card"
	data-animating={String(animating)}
	class="grid w-full max-w-xs grid-cols-3 gap-2.5 rounded-3xl border-2 border-line bg-white p-3 shadow-[0_4px_0_var(--color-line)]"
>
	{#each squares as square (square.label)}
		<BingoSquare {...square} />
	{/each}
</div>
