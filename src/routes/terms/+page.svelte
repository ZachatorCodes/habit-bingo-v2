<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo
	title="Terms"
	description="The terms for using Habit Bingo during its invite-only beta."
	path="/terms"
/>

<article class="mx-auto max-w-2xl px-4 pt-12 leading-relaxed">
	<h1 class="text-3xl font-black">Terms</h1>
	<p class="mt-2 text-sm text-ink/60">Last updated October 9, 2026</p>

	<h2 class="mt-8 text-xl font-extrabold">Invite-only beta</h2>
	<p class="mt-2">
		Habit Bingo is an invite-only beta built for a small group of friends. Features may change, and
		data may occasionally be reset while the app is in beta.
	</p>

	<h2 class="mt-8 text-xl font-extrabold">Acceptable use</h2>
	<p class="mt-2">
		Be kind in group names, rewards and reactions. Don't try to access other people's accounts,
		interfere with the service, or use it for anything unlawful. We may remove accounts that do.
	</p>

	<h2 class="mt-8 text-xl font-extrabold">No warranty</h2>
	<p class="mt-2">
		The app is provided as is, without warranties of any kind. It is a habit game, not medical,
		financial or professional advice.
	</p>

	<h2 class="mt-8 text-xl font-extrabold">Your account</h2>
	<p class="mt-2">
		You can delete your account at any time from Me → Delete account. See the
		<a class="underline" href={resolve('/privacy')}>privacy page</a> for what we store.
	</p>
</article>
