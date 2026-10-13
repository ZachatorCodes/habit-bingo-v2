<script lang="ts">
	type Props = {
		/** Set a new message to show it; each one hides after `duration` ms. */
		message: string | null;
		duration?: number;
	};

	let { message, duration = 4000 }: Props = $props();

	let shown = $state<string | null>(null);

	$effect(() => {
		shown = message;
		if (!message) return;
		const timer = setTimeout(() => (shown = null), duration);
		return () => clearTimeout(timer);
	});
</script>

<!-- The live region always exists, so screen readers announce messages as they arrive. -->
<div
	role="status"
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
>
	{#if shown}
		<p class="pointer-events-auto rounded-xl bg-ink px-4 py-3 font-bold text-cream shadow-lg">
			<span aria-hidden="true">⚠</span>
			{shown}
		</p>
	{/if}
</div>
