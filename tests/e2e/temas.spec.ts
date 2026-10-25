import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ORIGEN, abrirBd, iniciarSesion } from './ayudantes.ts';

const TEMAS = ['clasico', 'bistro', 'noche', 'fotos'] as const;
const NOMBRES: Record<(typeof TEMAS)[number], string> = { clasico: 'Clásico', bistro: 'Bistró', noche: 'Noche', fotos: 'Fotos' };
const CATEGORIA = `Temas E2E ${Date.now().toString(36)}`;
const FOTO = JSON.stringify({ sm: '/marca/logo-160.webp', lg: '/marca/logo-320.webp', ancho: 160, alto: 160, altEs: 'Logo de prueba' });

test.describe.configure({ mode: 'serial' });

async function fijarTema(tema: string): Promise<void> {
	const bd = await abrirBd();
	await bd.execute({ sql: 'update negocio set tema = ? where id = 1', args: [tema] });
	bd.close();
}

test.beforeAll(async () => {
	// Productos con y sin foto, uno agotado y uno recomendado: así cada diseño se prueba con todos sus estados.
	const bd = await abrirBd();
	const { lastInsertRowid } = await bd.execute({ sql: 'insert into categoria (slug, nombre_es, orden) values (?, ?, 998)', args: [`temas-e2e-${Date.now()}`, CATEGORIA] });
	const productos: [string, string, number | null, number, number, string | null][] = [
		['Con foto', 'Una descripción de ejemplo bastante larga para ver cómo se acomoda en cada diseño', 6500, 1, 0, FOTO],
		['Sin foto', 'Sin imagen', 3000, 1, 0, null],
		['Agotado con foto', '', 4500, 0, 0, FOTO],
		['Recomendado', 'Muy pedido', null, 1, 1, null],
	];
	for (const [orden, [nombre, descripcion, precio, disponible, destacado, imagen]] of productos.entries()) {
		await bd.execute({
			sql: "insert into producto (categoria_id, nombre_es, descripcion_es, precio, disponible, destacado, imagen, orden, alergenos, etiquetas) values (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]')",
			args: [lastInsertRowid!, nombre, descripcion, precio, disponible, destacado, imagen, orden],
		});
	}
	bd.close();
});

test.afterAll(async () => {
	await fijarTema('clasico');
	const bd = await abrirBd();
	await bd.execute({ sql: 'delete from producto where categoria_id in (select id from categoria where nombre_es = ?)', args: [CATEGORIA] });
	await bd.execute({ sql: 'delete from categoria where nombre_es = ?', args: [CATEGORIA] });
	bd.close();
});

test.beforeEach(async ({ context }) => iniciarSesion(context));

const desborde = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('elegir el diseño en el panel', () => {
	test('lista los diseños con su descripción, marca el que está en uso y enlaza a su vista previa', async ({ page }) => {
		await fijarTema('clasico');
		await page.goto('/admin/diseno');

		for (const tema of TEMAS) {
			await expect(page.getByRole('radio', { name: new RegExp(NOMBRES[tema]) })).toBeVisible();
			await expect(page.getByRole('link', { name: new RegExp(`diseño ${NOMBRES[tema]} con mis productos`) })).toHaveAttribute('href', `/admin/vista-previa/${tema}`);
		}
		await expect(page.getByRole('radio', { name: /Clásico/ })).toBeChecked();
		await expect(page.locator('.tema-tarjeta--actual')).toContainText('En uso');
	});

	test('al guardar un diseño, la carta pública y su versión en inglés lo usan', async ({ page }) => {
		await page.goto('/admin/diseno');
		await page.getByRole('radio', { name: /Noche/ }).check();
		await page.getByRole('button', { name: 'Usar este diseño' }).click();

		await expect(page.getByRole('status')).toContainText('Diseño «Noche» guardado');
		await expect(page.locator('.tema-tarjeta--actual')).toContainText('Noche');
		for (const ruta of ['/', '/en/']) {
			await page.goto(ruta);
			await expect(page.locator('body')).toHaveClass(/tema-noche/);
			await expect(page.locator('link[rel="stylesheet"][href*="noche"]')).toHaveCount(1);
			await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#14110f');
		}
	});

	test('volver al clásico no carga ninguna hoja de estilos extra', async ({ page }) => {
		await fijarTema('noche');
		await page.goto('/admin/diseno');
		await page.getByRole('radio', { name: /Clásico/ }).check();
		await page.getByRole('button', { name: 'Usar este diseño' }).click();
		await expect(page.getByRole('status')).toContainText('Diseño «Clásico» guardado');

		await page.goto('/');

		await expect(page.locator('body')).toHaveClass(/tema-clasico/);
		for (const otro of ['bistro', 'noche', 'fotos']) await expect(page.locator(`link[rel="stylesheet"][href*="${otro}"]`)).toHaveCount(0);
	});

	test('el valor de la base que no corresponde a un diseño cae en el clásico', async ({ page }) => {
		await fijarTema('inventado');

		await page.goto('/');

		await expect(page.locator('body')).toHaveClass(/tema-clasico/);
		await fijarTema('clasico');
	});

	test('un diseño que no existe no se puede guardar', async ({ context }) => {
		const respuesta = await context.request.post('/_actions/guardarTema/', { multipart: { tema: 'hackeado' }, headers: { Origin: ORIGEN } });

		expect(await respuesta.text()).toContain('Elige uno de los diseños de la lista.');
		const bd = await abrirBd();
		const { rows } = await bd.execute('select tema from negocio where id = 1');
		bd.close();
		expect(rows[0]?.tema).not.toBe('hackeado');
	});

	test('sin sesión no se puede cambiar el diseño ni ver la vista previa', async ({ playwright }) => {
		const anonimo = await playwright.request.newContext({ baseURL: ORIGEN, extraHTTPHeaders: { Origin: ORIGEN } });

		const cambio = await anonimo.post('/_actions/guardarTema/', { multipart: { tema: 'noche' } });
		const vista = await anonimo.get('/admin/vista-previa/noche', { maxRedirects: 0 });

		expect(cambio.status()).toBe(401);
		expect(vista.status()).toBe(303);
		expect(vista.headers().location).toBe('/admin/login');
		await anonimo.dispose();
	});
});

test.describe('vista previa', () => {
	test('avisa que todavía no es lo que ven los clientes y no cambia el diseño guardado', async ({ page }) => {
		await fijarTema('clasico');

		await page.goto('/admin/vista-previa/bistro');

		await expect(page.locator('.vista-previa')).toContainText('Vista previa del diseño Bistró');
		await expect(page.locator('body')).toHaveClass(/tema-bistro/);
		await page.getByRole('link', { name: 'Volver a Diseño' }).click();
		await expect(page).toHaveURL(/\/admin\/diseno$/);
		await expect(page.locator('.tema-tarjeta--actual')).toContainText('Clásico');
	});

	test('un diseño desconocido lleva de vuelta a la pantalla de diseño', async ({ page }) => {
		await page.goto('/admin/vista-previa/inventado');

		await expect(page).toHaveURL(/\/admin\/diseno$/);
	});

	test('no se indexa ni se guarda en caché', async ({ page }) => {
		const respuesta = await page.goto('/admin/vista-previa/noche');

		expect(respuesta?.headers()['cache-control']).toBe('no-store');
		expect(respuesta?.headers()['x-robots-tag']).toContain('noindex');
	});
});

for (const tema of TEMAS) {
	test.describe(`diseño ${NOMBRES[tema]}`, () => {
		test('no tiene violaciones de accesibilidad WCAG 2.2 AA (con fotos, agotados y recomendados)', async ({ page }) => {
			await page.goto(`/admin/vista-previa/${tema}`);
			await expect(page.getByRole('heading', { name: CATEGORIA })).toBeVisible();

			const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

			expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
		});

		for (const ancho of [320, 375, 768, 1440]) {
			test(`se ve bien a ${ancho}px (sin scroll horizontal)`, async ({ page }) => {
				await page.setViewportSize({ width: ancho, height: 900 });
				await page.goto(`/admin/vista-previa/${tema}`);
				await expect(page.getByRole('heading', { name: CATEGORIA })).toBeVisible();

				expect(await desborde(page)).toBeLessThanOrEqual(0);
				await page.screenshot({ path: `test-results/capturas/tema-${tema}-${ancho}.png`, fullPage: true });
			});
		}

		test('muestra los mismos productos que los demás diseños', async ({ page }) => {
			await page.goto(`/admin/vista-previa/${tema}`);
			const seccion = page.locator('section', { has: page.getByRole('heading', { name: CATEGORIA }) });

			await expect(seccion.locator('.producto')).toHaveCount(4);
			await expect(seccion.locator('.producto', { hasText: 'Con foto' }).first()).toContainText('$6.500');
			await expect(seccion.locator('.producto', { hasText: 'Agotado con foto' })).toContainText('Agotado');
			await expect(seccion.locator('.producto', { hasText: 'Recomendado' })).toContainText('Consultar');
		});
	});
}
