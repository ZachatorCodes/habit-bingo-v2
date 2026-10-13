<script lang="ts" module>
	import type { SquareState } from '#lib/game/square-state.ts';

	/** One habit square as the habit sheet shows it (spec §4.6). */
	export type SheetData = {
		id: string;
		emoji: string;
		name: string;
		/** "🥗 Health" */
		category: string;
		/** "8 times a day" */
		rule: string;
		/** `times` gets a stepper, `days` a "Done that day" toggle. */
		countMode: 'times' | 'days';
		state: SquareState;
		progress: number;
		stateText: string;
		progressText: string;
		today: string;
		/** The day being logged. */
		day: string;
		/** Days that can be logged, newest first. */
		days: string[];
		/** That day's count. */
		count: number;
		/** Newest first. */
		history: { date: string; count: number }[];
	};
</script>

<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { prefersReducedMotion } from 'svelte/motion';
	import { burst, tap } from '#lib/celebrate.ts';
	import { addDays, weekday } from '#lib/game/calendar.ts';
	import BingoSquare from './BingoSquare.svelte';
	import Toast from './Toast.svelte';

	type Props = {
		data: SheetData;
		/** Shown over the card: day links and saves refresh the sheet in place through this. */
		onnavigate?: (href: string) => Promise<void>;
	};

	let { data, onnavigate }: Props = $props();

	const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const base = $derived(resolve('/(app)/card/squares/[id]', { id: data.id }));
	const dayQuery = (day: string) => (day === data.today ? '' : `?day=${day}`);
	const label = (day: string) =>
		day === data.today
			? 'Today'
			: day === addDays(data.today, -1)
				? 'Yesterday'
				: WEEKDAYS[weekday(day)];
	const short = (day: string) => `${WEEKDAYS[weekday(day)].slice(0, 3)} ${Number(day.slice(8))}`;

	/** The count shown while a change is on its way; null shows the server's. */
	let pending = $state<number | null>(null);
	const count = $derived(pending ?? data.count);
	let toast = $state<{ id: number; text: string } | null>(null);

	function follow(event: MouseEvent, href: string) {
		if (!onnavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
			return;
		event.preventDefault();
		void onnavigate(href);
	}

	function optimistic(next: () => number): SubmitFunction {
		return ({ submitter }) => {
			const before = count;
			pending = next();
			if (pending > before) {
				tap();
				const box = submitter?.getBoundingClientRect();
				if (box) {
					void burst(
						{
							x: (box.left + box.width / 2) / window.innerWidth,
							y: (box.top + box.height / 2) / window.innerHeight
						},
						prefersReducedMotion.current
					);
				}
			}
			return async ({ result, update }) => {
				if (result.type === 'failure' || result.type === 'error') {
					pending = null;
					const message =
						result.type === 'failure' && typeof result.data?.message === 'string'
							? result.data.message
							: "Couldn't save that. Try again.";
					toast = { id: (toast?.id ?? 0) + 1, text: message };
					return;
				}
				// The action redirects back to this sheet; refresh in place instead of navigating.
				if (result.type === 'redirect') {
					if (onnavigate) await onnavigate(`${base}${dayQuery(data.day)}`);
					else await invalidateAll();
				} else {
					await update();
				}
				pending = null;
			};
		};
	}

	const action = (name: string) =>
		`${base}?/${name}${data.day === data.today ? '' : `&day=${data.day}`}`;
	const round =
		'grid size-12 place-items-center rounded-2xl border-2 text-2xl font-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40';
</script>

<div class="mt-4 flex flex-col gap-5">
	<div class="flex items-center gap-4">
		<div class="w-20 shrink-0">
			<BingoSquare
				emoji={data.emoji}
				label={data.name}
				state={data.state}
				progress={data.progress}
				showLabel={false}
			/>
		</div>
		<div class="flex flex-col gap-0.5">
			<p class="text-sm font-bold text-ink/75">{data.category}</p>
			<p class="font-extrabold">{data.rule}</p>
			<p>{data.stateText}</p>
			<p class="text-sm text-ink/75">{data.progressText}</p>
		</div>
	</div>

	<nav aria-label="Day" class="flex flex-wrap gap-2">
		{#each data.days as day (day)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() can't carry the ?day= query -->
			<a
				href={`${base}${dayQuery(day)}`}
				onclick={(event) => follow(event, `${base}${dayQuery(day)}`)}
				aria-current={day === data.day ? 'date' : undefined}
				class={[
					'rounded-full border-2 px-3 py-1 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
					day === data.day ? 'border-ink bg-ink text-cream' : 'border-line bg-white'
				]}>{label(day)}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</nav>

	{#if data.countMode === 'times'}
		<div class="flex items-center gap-4">
			<form
				method="POST"
				action={action('unlog')}
				use:enhance={optimistic(() => Math.max(count - 1, 0))}
			>
				<input type="hidden" name="date" value={data.day} />
				<button
					type="submit"
					aria-label="Remove one"
					disabled={count === 0}
					class={[round, 'border-line bg-white']}>−</button
				>
			</form>
			<output aria-label="Count" class="min-w-10 text-center text-3xl font-black">{count}</output>
			<form
				method="POST"
				action={action('log')}
				use:enhance={optimistic(() => Math.min(count + 1, 20))}
			>
				<input type="hidden" name="date" value={data.day} />
				<button
					type="submit"
					aria-label="Add one"
					class={[round, 'border-ink bg-accent shadow-[0_3px_0_var(--color-ink)]']}>+</button
				>
			</form>
		</div>
	{:else}
		<form method="POST" action={action('set')} use:enhance={optimistic(() => (count > 0 ? 0 : 1))}>
			<input type="hidden" name="date" value={data.day} />
			<input type="hidden" name="count" value={count > 0 ? 0 : 1} />
			<button
				type="submit"
				aria-pressed={count > 0}
				class={[
					'rounded-2xl border-2 px-4 py-2.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
					count > 0 ? 'border-ink bg-earn' : 'border-line bg-white'
				]}><span aria-hidden="true">{count > 0 ? '✓' : '○'}</span> Done that day</button
			>
		</form>
	{/if}

	<div>
		<h3 class="font-extrabold">History</h3>
		<ul aria-label="History" class="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
			{#each data.history as entry (entry.date)}
				<li class={entry.count > 0 ? 'font-extrabold' : 'text-ink/60'}>
					{#if entry.count > 0}<span aria-hidden="true">✓ </span>{/if}{short(entry.date)} — {entry.count}
				</li>
			{/each}
		</ul>
	</div>
</div>

<Toast message={toast} />
