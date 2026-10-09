<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer class="mt-16 border-t-2 border-line px-4 py-8 text-sm text-ink/70">
	<nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
		<span class="font-extrabold text-ink">🎯 Habit Bingo</span>
		<div class="flex gap-5">
			<a class="underline-offset-4 hover:underline" href={resolve('/privacy')}>Privacy</a>
			<a class="underline-offset-4 hover:underline" href={resolve('/terms')}>Terms</a>
		</div>
	</nav>
</footer>
