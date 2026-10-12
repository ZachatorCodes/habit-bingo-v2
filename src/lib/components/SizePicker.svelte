<script lang="ts">
	import { CARD_SIZES, type CardSize } from '#lib/game/card-layout.ts';

	type Props = { selected: CardSize | null; habitCount: number; errorId?: string };
	let { selected, habitCount, errorId }: Props = $props();

	const sizes: CardSize[] = [3, 5];
</script>

<fieldset
	class="flex flex-col gap-3"
	role="radiogroup"
	aria-invalid={errorId ? 'true' : undefined}
	aria-describedby={errorId}
>
	<legend class="mb-1.5 text-xl font-black">Card size</legend>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each sizes as size (size)}
			{@const need = CARD_SIZES[size].habits}
			<label
				class="group flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-line bg-white p-4 shadow-[0_3px_0_var(--color-line)] has-[:checked]:border-ink has-[:checked]:bg-cream has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
			>
				<input type="radio" name="size" value={size} checked={selected === size} class="sr-only" />
				<span class="text-2xl font-black">{size}×{size}</span>
				<span class="hidden text-sm font-extrabold group-has-[:checked]:inline"
					><span aria-hidden="true">✓</span> Selected</span
				>
				<span class="font-bold">{need} habits · ×{CARD_SIZES[size].multiplier}</span>
				<span class="text-sm text-ink/75">You have {habitCount} habits / need {need}</span>
				{#if habitCount < need}
					<span class="text-sm font-bold">Add {need - habitCount} more in the next step.</span>
				{/if}
			</label>
		{/each}
	</div>
</fieldset>
