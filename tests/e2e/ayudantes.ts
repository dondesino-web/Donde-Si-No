import { createClient, type Client } from '@libsql/client';
import type { BrowserContext } from '@playwright/test';
import { NOMBRE_COOKIE_SESION, crearTokenSesion } from '../../src/lib/auth/sesion.ts';

export const ORIGEN = 'http://localhost:4399';

/** Entra al panel con una sesión válida firmada con el secreto del servidor de pruebas. */
export async function iniciarSesion(contexto: BrowserContext): Promise<void> {
	const secreto = process.env.E2E_SESSION_SECRET;
	if (!secreto) throw new Error('Falta E2E_SESSION_SECRET: las pruebas deben correr con `npm run test:e2e`.');

	await contexto.addCookies([
		{ name: NOMBRE_COOKIE_SESION, value: crearTokenSesion(secreto, new Date()), url: ORIGEN, httpOnly: true, sameSite: 'Strict' },
	]);
}

/**
 * Conexión de las pruebas a la base local. Varias pruebas corren en paralelo y escriben en el mismo archivo SQLite:
 * con `busy_timeout` esperan su turno en vez de fallar con SQLITE_BUSY.
 */
export async function abrirBd(): Promise<Client> {
	const cliente = createClient({ url: 'file:local.db' });
	await cliente.execute('pragma busy_timeout = 10000');
	return cliente;
}
