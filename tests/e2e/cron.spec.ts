import { expect, test } from '@playwright/test';
import { ORIGEN } from './ayudantes.ts';

const RUTA = `${ORIGEN}/api/cron/limpiar-fotos`;
const SECRETO = process.env.E2E_CRON_SECRET ?? '';

test.describe('cron de limpieza de fotos', () => {
	test('sin la cabecera de autorización responde 401 y no hace nada', async ({ request }) => {
		const respuesta = await request.get(RUTA);

		expect(respuesta.status()).toBe(401);
		expect(await respuesta.json()).toEqual({ error: 'No autorizado' });
	});

	test('con un secreto equivocado o mal escrito responde 401', async ({ request }) => {
		for (const cabecera of [`Bearer ${SECRETO}x`, `Bearer ${SECRETO.slice(1)}`, SECRETO, `bearer ${SECRETO}`, 'Bearer ']) {
			expect((await request.get(RUTA, { headers: { Authorization: cabecera } })).status(), cabecera).toBe(401);
		}
	});

	test('un administrador con sesión tampoco puede invocarlo sin el secreto (no es una ruta del panel)', async ({ context }) => {
		const { iniciarSesion } = await import('./ayudantes.ts');
		await iniciarSesion(context);

		expect((await context.request.get(RUTA)).status()).toBe(401);
	});

	test('con el secreto correcto limpia y responde el resumen, sin caché', async ({ request }) => {
		const respuesta = await request.get(RUTA, { headers: { Authorization: `Bearer ${SECRETO}` } });

		expect(respuesta.status()).toBe(200);
		expect(respuesta.headers()['cache-control']).toBe('no-store');
		expect(await respuesta.json()).toEqual({ revisadas: expect.any(Number), eliminadas: expect.any(Number), fallidas: 0, abortada: expect.any(Boolean), intentosPurgados: expect.any(Number) });
	});

	test('solo acepta GET (el cron de Vercel usa GET)', async ({ request }) => {
		const respuesta = await request.post(RUTA, { headers: { Authorization: `Bearer ${SECRETO}`, Origin: ORIGEN } });

		expect([404, 405]).toContain(respuesta.status());
	});
});
