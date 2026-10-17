<script lang="ts" module>
	import type { SquareState } from '#lib/game/square-state.ts';

	/** How a row looks: its square's state, progress text, and that day's count. */
	export type TodayRowView = {
		state: SquareState;
		progress: number;
		text: string;
		count: number;
	};

	/** One habit on Today, with how it will look after one more check-in or one fewer. */
	export type TodayRowData = TodayRowView & {
		squareId: string;
		icon: string;
		name: string;
		ifLogged: TodayRowView;
		ifUndone: TodayRowView | null;
	};
</script>

<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { prefersReducedMotion, Spring } from 'svelte/motion';
	import { burst, tap } from '#lib/celebrate.ts';
	import Check from 'phosphor-svelte/lib/Check';
	import Plus from 'phosphor-svelte/lib/Plus';
	import BingoSquare from './BingoSquare.svelte';

	type Props = {
		row: TodayRowData;
		/** The day being logged (YYYY-MM-DD). */
		day: string;
		/** The page's own query (e.g. "&day=2026-10-19"), carried through the form actions. */
		keep: string;
		/** Called with a message when the server refuses a check-in or can't be reached. */
		onerror?: (message: string) => void;
	};

	let { row, day, keep, onerror }: Props = $props();

	/** What the row shows while a check-in is on its way; null shows the server's row. */
	let pending = $state<TodayRowView | null>(null);
	const view = $derived(pending ?? row);
	const scale = new Spring(1, { stiffness: 0.3, damping: 0.4 });
	let logButton = $state<HTMLButtonElement>();

	/** Pop & burst (spec §4.7), then an optimistic update that rolls back if the server refuses. */
	// `next` is read when the form is submitted: enhance keeps the callback it was mounted with, so
	// reading the row then (not at mount) keeps the view in step with the latest data.
	function optimistic(next: () => TodayRowView | null, celebrate: boolean): SubmitFunction {
		return ({ submitter }) => {
			// The − button goes away at zero; if it had focus, focus moves to this row's +.
			const hadFocus = submitter === document.activeElement;
			const view = next();
			if (view) pending = view;
			if (celebrate) {
				tap();
				if (!prefersReducedMotion.current) {
					scale.set(0.85, { instant: true });
					scale.target = 1;
				}
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
					onerror?.(message);
					return;
				}
				// The action redirects back to this same day (so a no-JS refresh never re-posts). With
				// JavaScript, reload the data in place instead of following it, so the page keeps its
				// scroll position and focus.
				if (result.type === 'redirect') await invalidateAll();
				else await update();
				pending = null;
				if (hadFocus && !submitter?.isConnected) logButton?.focus();
			};
		};
	}

	// The day's target is met: the check is the undo action.
	const met = $derived(view.count > 0 && view.state === 'complete');
	const button =
		'grid size-11 shrink-0 place-items-center rounded-full text-xl font-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
</script>

<li class="flex items-center gap-3 py-3">
	<div
		class={['w-14 shrink-0', prefersReducedMotion.current && 'transition-opacity duration-200']}
		style:transform="scale({scale.current})"
		style:opacity={prefersReducedMotion.current && pending ? 0.6 : 1}
	>
		<BingoSquare
			icon={row.icon}
			label={row.name}
			state={view.state}
			progress={view.progress}
			showLabel={false}
		/>
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-[14.5px] font-bold">{row.name}</p>
		<p class="text-xs font-semibold text-muted">{view.text}</p>
	</div>
	{#if met}
		<form
			method="POST"
			action={`?/unlog${keep}`}
			use:enhance={optimistic(() => row.ifUndone, false)}
		>
			<input type="hidden" name="squareId" value={row.squareId} />
			<input type="hidden" name="date" value={day} />
			<button
				type="submit"
				aria-label="Undo one {row.name}"
				class={[button, 'bg-earned-tile text-forest']}
				><Check weight="bold" aria-hidden="true" /></button
			>
		</form>
	{:else}
		{#if view.count > 0}
			<form
				method="POST"
				action={`?/unlog${keep}`}
				use:enhance={optimistic(() => row.ifUndone, false)}
			>
				<input type="hidden" name="squareId" value={row.squareId} />
				<input type="hidden" name="date" value={day} />
				<button
					type="submit"
					aria-label="Undo one {row.name}"
					class={[button, 'bg-page text-muted']}>−</button
				>
			</form>
		{/if}
		<form method="POST" action={`?/log${keep}`} use:enhance={optimistic(() => row.ifLogged, true)}>
			<input type="hidden" name="squareId" value={row.squareId} />
			<input type="hidden" name="date" value={day} />
			<button
				type="submit"
				bind:this={logButton}
				aria-label="Log {row.name}"
				class={[button, 'bg-terracotta text-white']}
				><Plus weight="bold" aria-hidden="true" /></button
			>
		</form>
	{/if}
</li>
