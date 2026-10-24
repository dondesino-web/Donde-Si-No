import { abrirBd } from './ayudantes.ts';
import { expect, test } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD ?? '';

// El contador de intentos vive en la base local: se limpia para que las corridas no se contaminen.
async function limpiarIntentos(): Promise<void> {
	const cliente = await abrirBd();
	try {
		await cliente.execute('delete from intento_login');
	} finally {
		cliente.close();
	}
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarIntentos);
test.afterAll(limpiarIntentos);

test('sin sesión, /admin redirige al login', async ({ page }) => {
	await page.goto('/admin');

	await expect(page).toHaveURL(/\/admin\/login$/);
	await expect(page.getByLabel('Contraseña')).toBeVisible();
});

test('sin sesión, la API del panel responde 401 y el panel no se cachea ni se indexa', async ({ request }) => {
	const api = await request.get('/api/admin/upload');
	expect(api.status()).toBe(401);

	const login = await request.get('/admin/login');
	expect(login.headers()['cache-control']).toBe('no-store');
	expect(login.headers()['x-robots-tag']).toContain('noindex');
});

test.describe('no se puede esquivar la protección con rutas disfrazadas', () => {
	for (const ruta of ['/%61dmin', '/admin%2fcarta', '//admin', '/ADMIN', '/%2561dmin', '/admin/%2e%2e/admin', '/es/admin', '/api/%61dmin/upload']) {
		test(`${ruta}`, async ({ request }) => {
			const respuesta = await request.get(`http://localhost:4399${ruta}`, { maxRedirects: 0 });

			// Nunca debe servir contenido del panel: o redirige al login, o no existe, o es 401.
			expect([303, 401, 404]).toContain(respuesta.status());
			expect(await respuesta.text()).not.toContain('Sesión iniciada');
		});
	}
});

test('rechaza una contraseña incorrecta', async ({ page }) => {
	await page.goto('/admin/login');
	await page.getByLabel('Contraseña').fill('esta-no-es-la-clave');
	await page.getByRole('button', { name: 'Ingresar' }).click();

	await expect(page.getByRole('alert')).toHaveText('Contraseña incorrecta.');
	await expect(page).toHaveURL(/\/admin\/login$/);
});

test('con la contraseña correcta entra, la cookie es segura y puede salir', async ({ page, context }) => {
	await page.goto('/admin/login');
	await page.getByLabel('Contraseña').fill(PASSWORD);
	await page.getByRole('button', { name: 'Ingresar' }).click();

	await expect(page).toHaveURL(/\/admin$/);
	const [cookie] = (await context.cookies()).filter((c) => c.name === 'sesion');
	expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });

	await page.goto('/admin/login');
	await expect(page).toHaveURL(/\/admin$/); // con sesión, el login manda al panel

	await page.getByRole('button', { name: 'Salir' }).click();
	await expect(page).toHaveURL(/\/admin\/login$/);
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/admin\/login$/);
});

test('rechaza una cookie de sesión falsificada', async ({ page, context }) => {
	await context.addCookies([{ name: 'sesion', value: '99999999999999.firma-falsa', url: 'http://localhost:4399' }]);

	await page.goto('/admin');

	await expect(page).toHaveURL(/\/admin\/login$/);
});

test('bloquea el login tras demasiados intentos fallidos', async ({ page }) => {
	await limpiarIntentos();
	for (let i = 0; i < 5; i++) {
		await page.goto('/admin/login');
		await page.getByLabel('Contraseña').fill(`incorrecta-${i}`);
		await page.getByRole('button', { name: 'Ingresar' }).click();
	}

	await page.goto('/admin/login');
	await page.getByLabel('Contraseña').fill(PASSWORD);
	await page.getByRole('button', { name: 'Ingresar' }).click();

	await expect(page.getByRole('alert')).toContainText('Demasiados intentos');
	await expect(page).toHaveURL(/\/admin\/login$/);
});
