import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	webServer: { command: 'npm run build && tsx scripts/e2e-server.ts', port: 4173 },
	use: { baseURL: 'http://localhost:4173' },
	projects: [
		{ name: 'phone', use: { ...devices['Pixel 7'] } },
		{
			name: 'tablet',
			use: {
				...devices['iPad (gen 7)'],
				defaultBrowserType: 'chromium', // WebKit is not installed everywhere; width and touch are what matter
				viewport: { width: 820, height: 1180 }
			}
		},
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }
	]
});
