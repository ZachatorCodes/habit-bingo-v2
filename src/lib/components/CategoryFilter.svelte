<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORIES, type CategoryId } from '#lib/game/categories.ts';

	type Props = {
		selected: CategoryId | null;
		counts: Record<CategoryId, number>;
		archived: boolean;
	};
	let { selected, counts, archived }: Props = $props();

	const total = $derived(Object.values(counts).reduce((sum, n) => sum + n, 0));

	/** The query string for a filter link; the path is resolved inline where the link is built. */
	function query(category: CategoryId | null): string {
		const parts = [category ? `category=${category}` : '', archived ? 'archived=1' : ''].filter(
			Boolean
		);
		return parts.length ? `?${parts.join('&')}` : '';
	}

	const chip =
		'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
</script>

<!-- Links are resolve()d paths plus a query string, which the lint rule cannot follow. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav aria-label="Filter by category">
	<ul class="flex flex-wrap gap-2">
		<li>
			<a
				href={resolve('/(app)/me/habits') + query(null)}
				aria-current={selected === null ? 'true' : undefined}
				class={[chip, selected === null ? 'border-ink bg-ink text-cream' : 'border-line bg-white']}
				>All <span class="opacity-75">{total}</span></a
			>
		</li>
		{#each CATEGORIES as category (category.id)}
			<li>
				<a
					href={resolve('/(app)/me/habits') + query(category.id)}
					aria-current={selected === category.id ? 'true' : undefined}
					class={[
						chip,
						selected === category.id ? 'border-ink bg-ink text-cream' : 'border-line bg-white'
					]}
					><span aria-hidden="true">{category.emoji}</span>
					{category.label}
					<span class="opacity-75">{counts[category.id]}</span></a
				>
			</li>
		{/each}
	</ul>
</nav>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
