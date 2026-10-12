<script lang="ts">
	import BingoSquare from './BingoSquare.svelte';
	import Button from './Button.svelte';
	import TextField from './TextField.svelte';
	import { CATEGORIES, type CategoryId } from '#lib/game/categories.ts';
	import {
		defaultCountMode,
		describeRule,
		normalizeRule,
		targetRange,
		type CountMode,
		type Direction,
		type Period
	} from '#lib/game/habit-rules.ts';
	import type { HabitInput } from '#lib/server/habits.ts';

	type Props = {
		values: HabitInput;
		errors?: Record<string, string>;
		submitLabel: string;
	};
	let { values, errors = {}, submitLabel }: Props = $props();

	/** A few suggestions per category; any single emoji can be typed instead. */
	const QUICK_PICKS: Record<CategoryId, string[]> = {
		fitness: ['🚴', '🏃', '🏋️', '🧘', '🏊', '🥾'],
		health: ['💧', '🥗', '😴', '💊', '🍎', '🚭'],
		mind: ['🧠', '📓', '🙏', '🌿', '📵', '🧩'],
		home: ['🧹', '🧺', '🍳', '🌱', '🐈', '🗑️'],
		social: ['📞', '💌', '🎂', '🤝', '👋', '🍻'],
		learning: ['📚', '🎧', '🗣️', '💻', '✍️', '🔬'],
		creative: ['🎨', '🎸', '📷', '🧶', '🎹', '✏️'],
		money: ['💰', '🍔', '🛍️', '📊', '☕', '🏦'],
		other: ['✨', '⭐', '🎯', '✅', '🔥', '🌈']
	};

	// svelte-ignore state_referenced_locally
	let emoji = $state(values.emoji);
	// svelte-ignore state_referenced_locally
	let name = $state(values.name);
	// svelte-ignore state_referenced_locally
	let category = $state(values.category);
	// svelte-ignore state_referenced_locally
	let direction = $state(values.direction as Direction);
	// svelte-ignore state_referenced_locally
	let period = $state(values.period as Period);
	// svelte-ignore state_referenced_locally
	let countMode = $state((values.countMode ?? defaultCountMode(direction)) as CountMode);
	// svelte-ignore state_referenced_locally
	let target = $state<string | number>(values.target);
	// svelte-ignore state_referenced_locally
	let isPrivate = $state(values.isPrivate);
	/** Once the person picks a count mode, switching kind no longer overrides it. */
	let countModePicked = $state(false);

	function trackTyping(event: Event) {
		const input = event.target;
		if (!(input instanceof HTMLInputElement)) return;
		if (input.name === 'emoji') emoji = input.value;
		else if (input.name === 'name') name = input.value;
		else if (input.name === 'target') target = input.value;
	}

	function setDirection(next: Direction) {
		direction = next;
		if (next === 'atMost' && period === 'day') period = 'week';
		if (!countModePicked) countMode = defaultCountMode(next);
	}

	const range = $derived(targetRange(direction, period, period === 'day' ? 'times' : countMode));
	const preview = $derived(normalizeRule({ direction, period, countMode, target }));
	const picks = $derived(QUICK_PICKS[category as CategoryId] ?? QUICK_PICKS.other);

	const ids = $props.id();
	const field = 'flex flex-col gap-1.5';
	const select =
		'w-full rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-ink shadow-[0_3px_0_var(--color-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
	const choice =
		'flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-line bg-white px-3 py-2 font-bold shadow-[0_3px_0_var(--color-line)] has-[:checked]:border-ink has-[:checked]:bg-cream has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink';
</script>

{#snippet fieldError(key: string)}
	{#if errors[key]}
		<p id={`${ids}-${key}-error`} class="text-sm font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{errors[key]}
		</p>
	{/if}
{/snippet}

<!-- TextField values are one-way; typing is tracked from bubbling input events. -->
<div class="flex flex-col gap-6" oninput={trackTyping}>
	<div class={field}>
		<TextField label="Emoji" name="emoji" value={emoji} error={errors.emoji} hint="One emoji." />
		<div class="flex flex-wrap gap-2" role="group" aria-label="Suggested emoji">
			{#each picks as pick (pick)}
				<button
					type="button"
					aria-label={`Use ${pick}`}
					aria-pressed={emoji === pick}
					onclick={() => (emoji = pick)}
					class="flex size-11 items-center justify-center rounded-xl border-2 border-line bg-white text-2xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink aria-pressed:border-ink aria-pressed:bg-cream"
					>{pick}</button
				>
			{/each}
		</div>
	</div>

	<TextField label="Name" name="name" value={name} error={errors.name} hint="e.g. Go biking" />

	<fieldset class={field} aria-describedby={errors.category ? `${ids}-category-error` : undefined}>
		<legend class="mb-1.5 font-extrabold">Category</legend>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each CATEGORIES as option (option.id)}
				<label class={choice}>
					<input
						type="radio"
						name="category"
						value={option.id}
						bind:group={category}
						class="sr-only"
					/>
					<span aria-hidden="true">{option.emoji}</span>
					{option.label}
				</label>
			{/each}
		</div>
		{@render fieldError('category')}
	</fieldset>

	<fieldset
		class={field}
		aria-describedby={errors.direction ? `${ids}-direction-error` : undefined}
	>
		<legend class="mb-1.5 font-extrabold">Kind</legend>
		<div class="grid grid-cols-2 gap-2">
			<label class={choice}>
				<input
					type="radio"
					name="direction"
					value="atLeast"
					checked={direction === 'atLeast'}
					onchange={() => setDirection('atLeast')}
					class="sr-only"
				/>
				<span aria-hidden="true">✅</span> Do it
			</label>
			<label class={choice}>
				<input
					type="radio"
					name="direction"
					value="atMost"
					checked={direction === 'atMost'}
					onchange={() => setDirection('atMost')}
					aria-describedby={`${ids}-limit-hint`}
					class="sr-only"
				/>
				<span aria-hidden="true">🚫</span> Limit it
			</label>
		</div>
		<p id={`${ids}-limit-hint`} class="text-sm text-ink/75">
			Limit it counts slips, like eating out.
		</p>
		{@render fieldError('direction')}
	</fieldset>

	<fieldset class={field}>
		<legend class="mb-1.5 font-extrabold">How often</legend>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<TextField
				label="How many"
				name="target"
				type="number"
				value={target}
				min={range?.min}
				max={range?.max}
				error={errors.target}
			/>
			<div class={field}>
				<label for={`${ids}-period`} class="font-extrabold">Per</label>
				<select
					id={`${ids}-period`}
					name="period"
					bind:value={period}
					aria-invalid={errors.period ? 'true' : undefined}
					aria-describedby={errors.period ? `${ids}-period-error` : undefined}
					class={select}
				>
					{#if direction === 'atLeast'}<option value="day">a day</option>{/if}
					<option value="week">a week</option>
					<option value="month">a month</option>
				</select>
				{@render fieldError('period')}
			</div>
			{#if period !== 'day'}
				<div class={field}>
					<label for={`${ids}-count`} class="font-extrabold">Counting</label>
					<select
						id={`${ids}-count`}
						name="countMode"
						bind:value={countMode}
						onchange={() => (countModePicked = true)}
						class={select}
					>
						<option value="times">times</option>
						<option value="days">different days</option>
					</select>
				</div>
			{/if}
		</div>
	</fieldset>

	<label class="flex items-start gap-3 font-bold">
		<input
			type="checkbox"
			name="isPrivate"
			bind:checked={isPrivate}
			class="mt-1 size-5 accent-ink"
		/>
		<span>Private: friends see <span aria-hidden="true">🔒</span> instead of the name</span>
	</label>

	<section aria-label="Preview" class="flex items-center gap-4 rounded-2xl bg-cream p-4">
		<div class="w-24 shrink-0">
			<BingoSquare
				emoji={emoji.trim() || '✨'}
				label={name.trim() || 'Your habit'}
				state="empty"
				showLabel
			/>
		</div>
		<p class="font-bold">
			{preview.ok ? describeRule(preview.rule) : 'Finish the details to see how it reads.'}
		</p>
	</section>

	<div>
		<Button type="submit">{submitLabel}</Button>
	</div>
</div>
