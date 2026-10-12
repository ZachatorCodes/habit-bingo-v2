<script lang="ts">
	import { enhance } from '$app/forms';
	import { describeRule } from '#lib/game/habit-rules.ts';
	import { STARTERS } from '#lib/game/starters.ts';

	type Props = {
		addedIds: string[];
		/**
		 * The page's own query (e.g. "&category=fitness"), appended to form actions: an action URL
		 * like "?/archive" replaces the query, so without it the page would lose its view after posting.
		 */
		keep?: string;
	};
	let { addedIds, keep = '' }: Props = $props();

	/** Starters being added right now, so a second tap does nothing while the first is in flight. */
	let pending = $state<string[]>([]);
</script>

<section aria-labelledby="quick-start-heading" class="flex flex-col gap-3">
	<div>
		<h2 id="quick-start-heading" class="text-xl font-black">Quick start</h2>
		<p class="text-ink/75">Tap to add. You can change them later.</p>
	</div>
	<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		{#each STARTERS as starter (starter.id)}
			{@const added = addedIds.includes(starter.id)}
			<li>
				<form
					method="POST"
					action={`?/addStarter${keep}`}
					use:enhance={() => {
						pending = [...pending, starter.id];
						return async ({ update }) => {
							await update({ reset: false });
							pending = pending.filter((id) => id !== starter.id);
						};
					}}
				>
					<input type="hidden" name="starterId" value={starter.id} />
					<button
						type="submit"
						disabled={added || pending.includes(starter.id)}
						aria-label={added ? `${starter.name} added` : `Add ${starter.name}`}
						class="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 text-left shadow-[0_3px_0_var(--color-line)] transition-transform focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-y-[3px] active:shadow-none disabled:translate-y-0 disabled:bg-cream disabled:shadow-none"
					>
						<span aria-hidden="true" class="text-3xl leading-none">{starter.emoji}</span>
						<span class="flex-1">
							<span class="block font-extrabold">{starter.name}</span>
							<span class="block text-sm text-ink/75">{describeRule(starter.rule)}</span>
						</span>
						<span class="text-sm font-bold">{added ? 'Added ✓' : '+ Add'}</span>
					</button>
				</form>
			</li>
		{/each}
	</ul>
</section>
