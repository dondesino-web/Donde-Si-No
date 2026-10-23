/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		globalSetup: ['tests/ayudantes/global.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			// Puntos de entrada que solo leen `astro:env`; se cubren con E2E.
			exclude: ['src/lib/**/index.ts'],
			thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
		},
	},
});
