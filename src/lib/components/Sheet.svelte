<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	type Props = {
		/** Names the dialog. */
		title: string;
		/** Called on ✕, Escape or a tap outside; the owner removes the sheet. */
		onclose: () => void;
		children: Snippet;
	};

	let { title, onclose, children }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	const titleId = $props.id();

	// A bottom sheet on phones, a centered dialog wider (spec §4.6). Focus goes back to whatever
	// opened it when it closes.
	onMount(() => {
		const opener = document.activeElement as HTMLElement | null;
		dialog?.showModal();
		return () => {
			dialog?.close();
			opener?.focus();
		};
	});

	function cancel(event: Event) {
		// Escape: let the owner remove the sheet rather than closing the dialog underneath it.
		event.preventDefault();
		onclose();
	}

	function backdrop(event: MouseEvent) {
		if (event.target === dialog) onclose();
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	oncancel={cancel}
	onclick={backdrop}
	class="w-full max-w-lg overflow-visible bg-transparent p-0 text-ink backdrop:bg-ink/40 max-sm:mt-auto max-sm:mb-0 max-sm:max-w-none sm:m-auto"
>
	<div
		class="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-2 border-ink bg-cream p-5 shadow-[0_-4px_0_var(--color-ink)] sm:rounded-3xl sm:shadow-[0_4px_0_var(--color-ink)]"
	>
		<div class="flex items-start justify-between gap-3">
			<h2 id={titleId} class="text-xl font-black">{title}</h2>
			<button
				type="button"
				onclick={onclose}
				aria-label="Close"
				class="grid size-10 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-lg font-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				><span aria-hidden="true">✕</span></button
			>
		</div>
		{@render children()}
	</div>
</dialog>
