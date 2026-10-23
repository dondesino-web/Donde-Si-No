import { randomBytes } from 'node:crypto';
import { defineConfig } from '@playwright/test';
import { hashearPassword } from './src/lib/auth/password.ts';

// Servidor propio en otro puerto: así no depende de (ni pisa) el `npm run dev` del desarrollador.
const PUERTO = 4399;

// Credenciales solo para esta ejecución de pruebas: se generan al vuelo y no se guardan.
// Los workers reevalúan este archivo: se reutiliza la ya generada por el proceso principal.
const PASSWORD_PRUEBA = process.env.E2E_PASSWORD ?? randomBytes(12).toString('base64url');
process.env.E2E_PASSWORD = PASSWORD_PRUEBA;
// Permite a las pruebas del panel crear su propia sesión sin pasar por el login (y su límite de intentos).
const SECRETO_SESION_PRUEBA = process.env.E2E_SESSION_SECRET ?? randomBytes(32).toString('base64url');
process.env.E2E_SESSION_SECRET = SECRETO_SESION_PRUEBA;

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
		command: `npm run dev -- --port ${PUERTO}`,
		url: `http://localhost:${PUERTO}`,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			ADMIN_PASSWORD_HASH: await hashearPassword(PASSWORD_PRUEBA),
			SESSION_SECRET: SECRETO_SESION_PRUEBA,
		},
	},
});
