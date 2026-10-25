import { NOMBRE_COOKIE_SESION, crearTokenSesion } from '../../src/lib/auth/sesion.ts';

const ORIGEN = 'http://localhost:4399';
const RUTAS_PUBLICAS = ['/', '/en/', '/imprimir', '/en/print', '/robots.txt', '/sitemap.xml'];
const RUTAS_DEL_PANEL = [
	'/admin/login',
	'/admin',
	'/admin/carta',
	'/admin/diseno',
	'/admin/vista-previa/noche',
	'/admin/producto/nuevo',
	'/admin/promociones',
	'/admin/promocion/nuevo',
	'/admin/menu-del-dia',
	'/admin/fotos',
	'/admin/local',
	'/admin/estadisticas',
	'/admin/qr',
	'/admin/qr/tarjeta',
];

/**
 * El servidor de desarrollo compila cada página la primera vez que la piden. Con la caché vacía (una máquina nueva o un CI)
 * decenas de pruebas en paralelo se atascan juntas y agotan su tiempo. Visitar cada página una vez, en orden, antes de
 * empezar evita ese atasco.
 */
export default async function calentar(): Promise<void> {
	const secreto = process.env.E2E_SESSION_SECRET;
	const sesion: Record<string, string> = secreto ? { Cookie: `${NOMBRE_COOKIE_SESION}=${crearTokenSesion(secreto, new Date())}` } : {};

	for (const ruta of RUTAS_PUBLICAS) await visitar(ruta, {});
	for (const ruta of RUTAS_DEL_PANEL) await visitar(ruta, sesion);
}

async function visitar(ruta: string, cabeceras: Record<string, string>): Promise<void> {
	try {
		await fetch(`${ORIGEN}${ruta}`, { headers: cabeceras, redirect: 'manual', signal: AbortSignal.timeout(60_000) });
	} catch (error) {
		// No debe impedir que corra la suite: si una página no responde, la prueba que la use lo mostrará.
		console.warn(`[calentamiento] ${ruta} no respondió`, error instanceof Error ? error.message : error);
	}
}
