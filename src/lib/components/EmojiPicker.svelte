<script lang="ts">
	type Props = {
		name: string;
		value: string;
		options: readonly string[];
		/** Visible group label. */
		label?: string;
	};

	let { name, value = $bindable(), options, label = 'Avatar' }: Props = $props();

	const labelId = $props.id();
</script>

<!-- Native radios: one tab stop, arrow keys move and select, and it posts without JavaScript. -->
<div class="flex flex-col gap-1.5">
	<span id={labelId} class="font-extrabold">{label}</span>
	<div role="radiogroup" aria-labelledby={labelId} class="grid grid-cols-6 gap-2">
		{#each options as emoji (emoji)}
			<label class="relative block">
				<input type="radio" {name} value={emoji} bind:group={value} class="peer sr-only" />
				<span
					aria-hidden="true"
					class="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-line bg-white text-2xl shadow-[0_3px_0_var(--color-line)] peer-checked:border-ink peer-checked:bg-accent peer-checked:shadow-[0_3px_0_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
				>
					{emoji}
				</span>
				<!-- Selection is shown by a mark as well as colour. -->
				<span
					aria-hidden="true"
					class="pointer-events-none absolute -top-1 -right-1 hidden size-5 items-center justify-center rounded-full bg-ink text-xs font-black text-white peer-checked:flex"
					>✓</span
				>
				<!-- The accessible name; the visible emoji above is hidden so it is not read twice. -->
				<span class="sr-only">{emoji}</span>
			</label>
		{/each}
	</div>
</div>
