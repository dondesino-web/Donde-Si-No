import { defineConfig } from '@playwright/test';

const PUERTO = 4321;

export default defineConfig({
	testDir: 'tests/e2e',
	outputDir: 'test-results',
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PUERTO}`,
		// Usa el Chrome instalado: evita descargar navegadores de Playwright.
		channel: 'chrome',
	},
	webServer: {
		command: 'npm run dev',
		url: `http://localhost:${PUERTO}`,
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
