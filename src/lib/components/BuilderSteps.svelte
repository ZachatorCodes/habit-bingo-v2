<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Step } from '#lib/server/card-drafts.ts';

	type Props = { steps: Step[]; current: Step; completed: Step[] };
	let { steps, current, completed }: Props = $props();

	const LABELS: Record<Step, string> = {
		size: 'Size',
		habits: 'Habits',
		targets: 'Targets',
		rewards: 'Rewards',
		board: 'Board'
	};
	const position = $derived(steps.indexOf(current) + 1);
</script>

<ol aria-label="Card builder steps" class="flex flex-wrap gap-2">
	{#each steps as step, index (step)}
		{@const done = completed.includes(step)}
		<li
			aria-current={step === current ? 'step' : undefined}
			class={[
				'rounded-full border-2 px-3 py-1 text-sm font-bold',
				step === current ? 'border-ink bg-ink text-cream' : 'border-line bg-white'
			]}
		>
			<span aria-hidden="true">{done && step !== current ? '✓' : index + 1}</span>
			{#if done && step !== current}
				<a
					href={resolve('/(app)/card/build/[step]', { step })}
					class="underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
					>{LABELS[step]}</a
				>
			{:else}
				<span>{LABELS[step]}</span>
			{/if}
			{#if step === current}
				<span class="sr-only">Step {position} of {steps.length}</span>
			{/if}
		</li>
	{/each}
</ol>
