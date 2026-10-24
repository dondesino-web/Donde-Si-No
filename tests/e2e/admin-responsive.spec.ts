import { expect, test } from '@playwright/test';
import { abrirBd, iniciarSesion } from './ayudantes.ts';

// El dueño usa el panel desde el celular: ninguna pantalla puede obligar a desplazarse de lado ni a hacer zoom.
const RUTAS = [
	'/admin',
	'/admin/carta',
	'/admin/carga-rapida',
	'/admin/promociones',
	'/admin/menu-del-dia',
	'/admin/fotos',
	'/admin/estadisticas',
	'/admin/qr',
	'/admin/local',
	'/admin/producto/nuevo',
	'/admin/promocion/nuevo',
];
const ANCHOS = [320, 375, 768];
// En el celular, la barra del panel ocupa una sola línea (logo, sección actual y «Menú»).
const ALTO_MAXIMO_BARRA_MOVIL = 72;

test.beforeEach(async ({ context }) => {
	await iniciarSesion(context);
});

test('el login no tiene scroll horizontal en un celular angosto', async ({ browser }) => {
	const pagina = await browser.newPage({ viewport: { width: 320, height: 700 } });
	await pagina.goto('/admin/login');

	const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	expect(desborde).toBeLessThanOrEqual(0);
	await pagina.close();
});

for (const ancho of ANCHOS) {
	test(`las pantallas del panel no tienen scroll horizontal a ${ancho}px`, async ({ page }) => {
		const bd = await abrirBd();
		const producto = await bd.execute('select id from producto limit 1');
		const promocion = await bd.execute('select id from promocion limit 1');
		bd.close();
		const rutas = [
			...RUTAS,
			...(producto.rows[0] ? [`/admin/producto/${producto.rows[0].id}`] : []),
			...(promocion.rows[0] ? [`/admin/promocion/${promocion.rows[0].id}`] : []),
		];
		await page.setViewportSize({ width: ancho, height: 900 });

		const conDesborde: string[] = [];
		for (const ruta of rutas) {
			await page.goto(ruta);
			const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			if (desborde > 0) conDesborde.push(`${ruta} (+${desborde}px)`);
		}

		expect(conDesborde).toEqual([]);
	});
}

test.describe('navegación del panel en el celular', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('la barra ocupa una sola línea y el menú se abre con todas las secciones', async ({ page }) => {
		await page.goto('/admin/carta');
		const barra = page.locator('.admin-barra');

		const alto = (await barra.boundingBox())?.height ?? Infinity;
		expect(alto).toBeLessThanOrEqual(ALTO_MAXIMO_BARRA_MOVIL);

		const menu = page.getByRole('navigation', { name: 'Panel' });
		await expect(menu.getByRole('link', { name: 'Estadísticas' })).toBeHidden();
		await page.getByText('Menú', { exact: true }).click();
		await expect(menu.getByRole('link', { name: 'Estadísticas' })).toBeVisible();
		await expect(menu.getByRole('button', { name: 'Salir' })).toBeVisible();
	});

	test('marca la sección en la que está el dueño', async ({ page }) => {
		await page.goto('/admin/carta');

		// El menú está plegado en el celular y `getByRole` ignora lo oculto: se busca por su identificador.
		await expect(page.locator('#menu-panel a[aria-current="page"]')).toHaveText('Carta');
		await expect(page.locator('.admin-barra__seccion')).toHaveText('Carta');
	});

	test('en una pantalla ancha todas las secciones se ven sin abrir el menú', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto('/admin');

		const menu = page.getByRole('navigation', { name: 'Panel' });
		await expect(menu.getByRole('link', { name: 'Estadísticas' })).toBeVisible();
		await expect(page.getByText('Menú', { exact: true })).toBeHidden();
	});
});
