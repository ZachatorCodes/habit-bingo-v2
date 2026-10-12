import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import autoAdapter from '@sveltejs/adapter-auto';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			csp: {
				// Hashes, not nonces: public pages are CDN-cached, and a cached nonce is a public nonce.
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Svelte transitions write inline styles.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					// Also limits where a form submission may redirect: the Google button posts to our
					// action, which 303s to Google's sign-in page.
					'form-action': ['self', 'https://accounts.google.com'],
					'object-src': ['none']
				}
			},
			// Vercel sets VERCEL=1 during its builds. adapter-vercel needs symlink permission, which local
			// Windows builds lack, so local builds use adapter-auto instead.
			adapter: process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs24.x' }) : autoAdapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,svelte}'],
			thresholds: {
				// Spec §7.1: the pure game rules module requires full branch coverage.
				'src/lib/game/**': { branches: 100, functions: 100, lines: 100, statements: 100 }
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// PGlite migrations and scrypt hashing make a module's first database test slow when
					// the whole suite runs in parallel.
					testTimeout: 15000,
					hookTimeout: 15000,
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
