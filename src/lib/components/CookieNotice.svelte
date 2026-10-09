<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { flyOrFade } from '#lib/motion.ts';

	const KEY = 'cookieNoticeDismissed';
	let visible = $state(false);

	// Storage can throw in private modes or with blocked site data; the notice is only informational.
	onMount(() => {
		try {
			visible = localStorage.getItem(KEY) !== '1';
		} catch {
			visible = true;
		}
	});

	function dismiss() {
		visible = false;
		try {
			localStorage.setItem(KEY, '1');
		} catch {
			// Nowhere to remember it; the notice shows again next visit.
		}
	}
</script>

{#if visible}
	<div
		role="region"
		aria-label="Cookie notice"
		transition:fly={flyOrFade(24, prefersReducedMotion.current)}
		class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border-2 border-line bg-white p-4 text-sm shadow-[0_3px_0_var(--color-line)]"
	>
		<p class="flex-1">We only use essential cookies to keep you signed in.</p>
		<button
			type="button"
			onclick={dismiss}
			class="rounded-xl bg-ink px-3 py-1.5 font-extrabold text-cream focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
		>
			Got it
		</button>
	</div>
{/if}
