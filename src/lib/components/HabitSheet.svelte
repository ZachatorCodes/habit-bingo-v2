<script lang="ts" module>
	import type { SquareState } from '#lib/game/square-state.ts';

	/** One habit square as the habit sheet shows it (spec §4.6). */
	export type SheetData = {
		id: string;
		icon: string;
		name: string;
		/** "Health" */
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
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { burst, tap } from '#lib/celebrate.ts';
	import { addDays, weekday } from '#lib/game/calendar.ts';
	import Plus from 'phosphor-svelte/lib/Plus';
	import ProgressRing from './ProgressRing.svelte';
	import Toast from './Toast.svelte';

	type Props = {
		data: SheetData;
		/** Shows the habit's name as the page heading (the page; a dialog already has it as its title). */
		titled?: boolean;
		/** Shown over the card: day links and saves refresh the sheet in place through this. */
		onnavigate?: (href: string) => Promise<void>;
	};

	let { data, titled = false, onnavigate }: Props = $props();

	const RING = {
		empty: 'open',
		inProgress: 'progress',
		complete: 'earned',
		held: 'protected',
		atRisk: 'risk',
		lost: 'lost',
		free: 'open',
		buildNext: 'open'
	} as const;
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
	let root = $state<HTMLElement>();
	let toast = $state<{ id: number; text: string } | null>(null);

	function follow(event: MouseEvent, href: string) {
		if (!onnavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
			return;
		event.preventDefault();
		void onnavigate(href);
	}

	function optimistic(next: () => number): SubmitFunction {
		return ({ submitter }) => {
			const hadFocus = submitter === document.activeElement;
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
				// A disabled − (at zero) drops focus: hand it to + so the keyboard stays in the stepper.
				if (hadFocus && (submitter as HTMLButtonElement).disabled) {
					await tick();
					root?.querySelector<HTMLElement>('[data-primary]')?.focus();
				}
			};
		};
	}

	const action = (name: string) =>
		`${base}?/${name}${data.day === data.today ? '' : `&day=${data.day}`}`;
	const round =
		'grid size-12 place-items-center rounded-full text-2xl font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40';
</script>

<div class="mt-4 flex flex-col gap-5" bind:this={root}>
	<div class="flex items-center gap-4">
		<ProgressRing
			icon={data.icon}
			variant={RING[data.state]}
			percent={Math.round(data.progress * 100)}
			size="lg"
		/>
		<div class="flex min-w-0 flex-col gap-0.5">
			{#if titled}<h1 class="text-xl leading-tight font-extrabold">{data.name}</h1>{/if}
			<p class="text-[13px] font-semibold text-muted">{data.category} · {data.rule}</p>
			<p class="font-bold">{data.stateText}</p>
			<p class="text-[13px] font-semibold text-muted">{data.progressText}</p>
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
					'rounded-full border px-3 py-1 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
					day === data.day ? 'border-forest bg-forest text-surface' : 'border-line bg-surface'
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
					class={[round, 'bg-page text-muted']}>−</button
				>
			</form>
			<output aria-label="Count" class="min-w-10 text-center text-3xl font-extrabold tabular-nums"
				>{count}</output
			>
			<form
				method="POST"
				action={action('log')}
				use:enhance={optimistic(() => Math.min(count + 1, 20))}
			>
				<input type="hidden" name="date" value={data.day} />
				<button
					type="submit"
					data-primary
					aria-label="Add one"
					class={[round, 'bg-terracotta text-white']}
					><Plus weight="bold" aria-hidden="true" /></button
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
					'rounded-2xl px-4 py-2.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
					count > 0 ? 'bg-earned-tile text-forest' : 'bg-terracotta text-white'
				]}><span aria-hidden="true">{count > 0 ? '✓' : '○'}</span> Done that day</button
			>
		</form>
	{/if}

	<div>
		<h3 class="text-xs font-extrabold tracking-[0.02em]">History</h3>
		<ul aria-label="History" class="mt-1 flex flex-col divide-y divide-line text-sm">
			{#each data.history as entry (entry.date)}
				<li class="flex justify-between py-2 {entry.count > 0 ? 'font-bold' : 'text-muted'}">
					<span>{short(entry.date)}</span><span class="tabular-nums">{entry.count}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>

<Toast message={toast} />
