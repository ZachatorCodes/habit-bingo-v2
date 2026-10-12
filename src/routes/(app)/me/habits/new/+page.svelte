<script lang="ts">
	import HabitFormPage from '../HabitFormPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<HabitFormPage
	title="New habit"
	lede="Something you want to do, or something you want to do less."
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	submitLabel="Add habit"
/>
