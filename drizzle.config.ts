import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
	schema: './src/lib/db/esquema.ts',
	out: './drizzle',
	dialect: 'turso',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL || 'file:local.db',
		authToken: process.env.TURSO_AUTH_TOKEN || undefined,
	},
});
