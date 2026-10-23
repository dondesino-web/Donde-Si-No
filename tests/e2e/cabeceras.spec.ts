import { expect, test } from '@playwright/test';

test.describe('cabeceras de seguridad', () => {
	for (const ruta of ['/', '/en/', '/imprimir', '/admin/login', '/robots.txt']) {
		test(`${ruta} impide incrustación, olfateo de tipos y formularios a otro origen`, async ({ request }) => {
			const respuesta = await request.get(ruta);
			const cabeceras = respuesta.headers();

			expect(cabeceras['x-content-type-options']).toBe('nosniff');
			expect(cabeceras['x-frame-options']).toBe('DENY');
			expect(cabeceras['referrer-policy']).toBe('strict-origin-when-cross-origin');
			expect(cabeceras['content-security-policy']).toContain("frame-ancestors 'none'");
			expect(cabeceras['content-security-policy']).toContain("form-action 'self'");
		});
	}

	test('también las respuestas de error y redirección las llevan', async ({ request }) => {
		const redireccion = await request.get('/admin', { maxRedirects: 0 });
		const noAutorizado = await request.get('/api/admin/upload');

		for (const respuesta of [redireccion, noAutorizado]) {
			expect(respuesta.headers()['x-content-type-options']).toBe('nosniff');
			expect(respuesta.headers()['x-frame-options']).toBe('DENY');
		}
	});
});
