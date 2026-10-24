import { expect, test, type Page } from '@playwright/test';
import { abrirBd, iniciarSesion } from './ayudantes.ts';

// Una categoría propia con productos conocidos: la prueba no depende de lo que haya en la base.
const CATEGORIA = `Lista E2E ${Date.now().toString(36)}`;
const PRODUCTOS = [
	{ nombre: 'Zeta con precio', descripcion: 'Con palta', precio: 3000, disponible: 1, visible: 1 },
	{ nombre: 'Zeta sin precio', descripcion: '', precio: null, disponible: 1, visible: 1 },
	{ nombre: 'Zeta agotada', descripcion: '', precio: 2000, disponible: 0, visible: 1 },
	{ nombre: 'Zeta oculta', descripcion: '', precio: 1000, disponible: 1, visible: 0 },
] as const;

test.describe.configure({ mode: 'serial' });

const fila = (page: Page, nombre: string) => page.locator('.fila-carta', { has: page.getByRole('link', { name: nombre, exact: true }) });
const visibles = async (page: Page): Promise<string[]> =>
	(await page.locator('.fila-carta:not([hidden]) .fila-carta__nombre').allTextContents()).filter((n) => n.startsWith('Zeta'));

test.beforeAll(async () => {
	const bd = await abrirBd();
	const { lastInsertRowid } = await bd.execute({ sql: 'insert into categoria (slug, nombre_es, orden) values (?, ?, 999)', args: [`lista-e2e-${Date.now()}`, CATEGORIA] });
	for (const [orden, p] of PRODUCTOS.entries()) {
		await bd.execute({
			sql: "insert into producto (categoria_id, nombre_es, descripcion_es, precio, disponible, visible, orden, alergenos, etiquetas) values (?, ?, ?, ?, ?, ?, ?, '[]', '[]')",
			args: [lastInsertRowid!, p.nombre, p.descripcion, p.precio, p.disponible, p.visible, orden],
		});
	}
	bd.close();
});

test.afterAll(async () => {
	const bd = await abrirBd();
	await bd.execute({ sql: 'delete from producto where categoria_id in (select id from categoria where nombre_es = ?)', args: [CATEGORIA] });
	await bd.execute({ sql: 'delete from categoria where nombre_es = ?', args: [CATEGORIA] });
	bd.close();
});

test.beforeEach(async ({ context }) => iniciarSesion(context));

test('cada producto muestra su estado con texto, no solo con color', async ({ page }) => {
	await page.goto('/admin/carta');

	await expect(fila(page, 'Zeta sin precio')).toContainText('Sin precio');
	await expect(fila(page, 'Zeta agotada')).toContainText('Agotado');
	await expect(fila(page, 'Zeta oculta')).toContainText('Oculto');
	await expect(fila(page, 'Zeta con precio')).toContainText('Con palta');
	await expect(fila(page, 'Zeta con precio').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
	await expect(fila(page, 'Zeta agotada').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});

test('el resumen y los filtros cuentan los productos de cada estado', async ({ page }) => {
	await page.goto('/admin/carta');

	for (const [filtro, minimo] of [['Todos', 4], ['Sin precio', 1], ['Agotados', 1], ['Ocultos', 1]] as const) {
		const numero = Number(await page.getByRole('button', { name: new RegExp(`^${filtro}`) }).locator('.filtro__numero').textContent());
		expect(numero, filtro).toBeGreaterThanOrEqual(minimo);
	}
});

test('el filtro «Sin precio» deja solo los que están en «Consultar»', async ({ page }) => {
	await page.goto('/admin/carta');

	await page.getByRole('button', { name: /^Sin precio/ }).click();

	expect(await visibles(page)).toEqual(['Zeta sin precio']);
	await expect(page.getByRole('button', { name: /^Sin precio/ })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: /^Todos/ })).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('[data-estado-filtro]')).toContainText('Mostrando');
});

test('los filtros «Agotados» y «Ocultos» muestran solo esos productos', async ({ page }) => {
	await page.goto('/admin/carta');

	await page.getByRole('button', { name: /^Agotados/ }).click();
	expect(await visibles(page)).toEqual(['Zeta agotada']);
	await page.getByRole('button', { name: /^Ocultos/ }).click();
	expect(await visibles(page)).toEqual(['Zeta oculta']);
	await page.getByRole('button', { name: /^Todos/ }).click();
	expect(await visibles(page)).toHaveLength(4);
});

test('la búsqueda ignora mayúsculas, tildes y encuentra por descripción; oculta las categorías sin resultados', async ({ page }) => {
	await page.goto('/admin/carta');

	await page.getByRole('searchbox', { name: 'Buscar producto' }).fill('PALTA');
	expect(await visibles(page)).toEqual(['Zeta con precio']);
	await expect(page.locator('[data-categoria]:not([hidden])')).toHaveCount(1);

	await page.getByRole('searchbox', { name: 'Buscar producto' }).fill('no existe este producto');
	await expect(page.getByText('Ningún producto coincide')).toBeVisible();
	await expect(page.locator('[data-categoria]:not([hidden])')).toHaveCount(0);

	await page.getByRole('searchbox', { name: 'Buscar producto' }).fill('');
	await expect(page.getByText('Ningún producto coincide')).toBeHidden();
	expect(await visibles(page)).toHaveLength(4);
});

test('«Guardar precio» aparece solo cuando el precio cambió, y Escape lo deshace', async ({ page }) => {
	await page.goto('/admin/carta');
	const guardar = fila(page, 'Zeta con precio').getByRole('button', { name: 'Guardar precio' });
	const campo = fila(page, 'Zeta con precio').getByLabel('Precio de Zeta con precio');

	await expect(guardar).toBeHidden();
	await campo.fill('3500');
	await expect(guardar).toBeVisible();
	await campo.press('Escape');
	await expect(campo).toHaveValue('3000');
	await expect(guardar).toBeHidden();
});

test('las flechas para ordenar solo aparecen en el modo «Ordenar»', async ({ page }) => {
	await page.goto('/admin/carta');
	const subir = page.getByRole('button', { name: 'Subir Zeta sin precio' });

	await expect(subir).toBeHidden();
	await page.getByRole('button', { name: 'Ordenar' }).click();
	await expect(subir).toBeVisible();
	await expect(page.getByRole('button', { name: 'Terminar de ordenar' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Terminar de ordenar' }).click();
	await expect(subir).toBeHidden();
});

test('una categoría se puede plegar y desplegar', async ({ page }) => {
	await page.goto('/admin/carta');
	const categoria = page.locator('[data-categoria]', { has: page.getByRole('heading', { name: CATEGORIA }) });

	await expect(fila(page, 'Zeta con precio')).toBeVisible();
	await categoria.locator('summary').first().click();
	await expect(fila(page, 'Zeta con precio')).toBeHidden();
	await categoria.locator('summary').first().click();
	await expect(fila(page, 'Zeta con precio')).toBeVisible();
});

test('el interruptor cambia la disponibilidad y se refleja en la lista', async ({ page }) => {
	await page.goto('/admin/carta');

	await fila(page, 'Zeta con precio').getByRole('switch').click();
	await expect(page.getByRole('status').filter({ hasText: 'Marcado como agotado.' })).toBeVisible();
	await expect(fila(page, 'Zeta con precio').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
	await expect(fila(page, 'Zeta con precio')).toContainText('Agotado');

	await fila(page, 'Zeta con precio').getByRole('switch').click();
	await expect(fila(page, 'Zeta con precio').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});
