<script lang="ts">
	import HabitFormPage from '../HabitFormPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<HabitFormPage
	title={`Edit ${data.name}`}
	lede="Changes apply to cards you build from now on."
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	submitLabel="Save habit"
	action="?/save"
>
	{#snippet footer()}
		<form
			method="POST"
			action="?/archive"
			class="flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-line p-5"
		>
			<p class="text-ink/75">
				Archiving hides it from new cards. You can restore it from the archived view.
			</p>
			<button
				type="submit"
				class="rounded-xl border-2 border-line bg-white px-4 py-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				>Archive</button
			>
		</form>
	{/snippet}
</HabitFormPage>
