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

// Secreto del cron de limpieza de fotos para esta ejecución de pruebas.
const SECRETO_CRON_PRUEBA = process.env.E2E_CRON_SECRET ?? randomBytes(24).toString('base64url');
process.env.E2E_CRON_SECRET = SECRETO_CRON_PRUEBA;

export default defineConfig({
	testDir: 'tests/e2e',
	globalSetup: './tests/e2e/calentar.ts',
	outputDir: 'test-results',
	// El servidor de desarrollo compila al vuelo y comparte un archivo SQLite: pocas pruebas en paralelo y esperas holgadas
	// dan una suite estable; con más trabajadores aparecen fallos por tiempo que no son defectos de la aplicación.
	workers: 4,
	// Un reintento absorbe los raros estancamientos del servidor de desarrollo (sin errores en la aplicación); Playwright marca
	// esas pruebas como «flaky» en el informe, así que no pasan inadvertidas.
	retries: 1,
	expect: { timeout: 10_000 },
	reporter: [['list']],
	// Las pruebas de diseños cambian el diseño guardado de la carta pública, que todas las demás leen: corren al final y solas.
	projects: [
		{ name: 'principal', testIgnore: /temas.spec.ts/ },
		{ name: 'temas', testMatch: /temas.spec.ts/, dependencies: ['principal'], fullyParallel: false },
	],
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
			// Las pruebas escriben datos: SIEMPRE contra la base local, aunque la terminal tenga cargadas las credenciales
				// de Turso (por ejemplo, tras aplicar las migraciones de producción).
				TURSO_DATABASE_URL: 'file:local.db',
				TURSO_AUTH_TOKEN: '',
				BLOB_READ_WRITE_TOKEN: '',
				ISR_BYPASS_TOKEN: '',
				ADMIN_PASSWORD_HASH: await hashearPassword(PASSWORD_PRUEBA),
			SESSION_SECRET: SECRETO_SESION_PRUEBA,
			CRON_SECRET: SECRETO_CRON_PRUEBA,
		},
	},
});
