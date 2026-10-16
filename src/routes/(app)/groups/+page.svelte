<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title="Groups" description="Your Habit Bingo groups." path="/groups" noindex />

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-3xl leading-tight font-black">Groups</h1>
		<Button href={resolve('/(app)/groups/new')}>Create a group</Button>
	</div>

	{#if data.groups.length === 0}
		<p class="text-lg text-ink/75">
			No groups yet. Create one, or ask a friend for their invite link.
		</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each data.groups as group (group.id)}
				<li>
					<!-- eslint-disable svelte/no-navigation-without-resolve --  -->
					<a
						href={`/groups/${group.id}`}
						class="flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-4 shadow-[0_3px_0_var(--color-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
					>
						<span class="text-3xl" aria-hidden="true">{group.emoji}</span>
						<span class="min-w-0 flex-1 truncate font-extrabold">{group.name}</span>
						<span class="text-ink/75"
							>{group.memberCount}
							{group.memberCount === 1 ? 'member' : 'members'}</span
						>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</li>
			{/each}
		</ul>
	{/if}
</section>
