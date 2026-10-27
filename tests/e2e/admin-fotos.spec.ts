import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';
import { ORIGEN, abrirBd, iniciarSesion } from './ayudantes.ts';

const CARPETA = join(process.cwd(), '.uploads');
const SUFIJO = Date.now();
const PRODUCTO = `Producto foto E2E ${SUFIJO}`;
const PROMO = `Promo foto E2E ${SUFIJO}`;

// Comparten el producto y las fotos que crean: se ejecutan en orden.
test.describe.configure({ mode: 'serial' });

const archivosSubidos = (): string[] => (existsSync(CARPETA) ? readdirSync(CARPETA) : []);
let archivosAntes: string[] = [];

/** JPEG pesado (ruido) para comprobar que el navegador lo comprime a WebP dentro de los límites. */
const fotoGrande = (ancho: number, alto: number): Promise<Buffer> =>
	sharp({ create: { width: ancho, height: alto, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
		.jpeg({ quality: 92 })
		.toBuffer();

async function limpiar(): Promise<void> {
	const cliente = await abrirBd();
	try {
		await cliente.execute("delete from producto where nombre_es like 'Producto foto E2E%'");
		await cliente.execute("delete from promocion where titulo_es like 'Promo foto E2E%'");
		await cliente.execute("delete from foto_destacada where imagen like '%Galeria E2E%'");
	} finally {
		cliente.close();
	}
	// Archivos que estas pruebas dejaron en la carpeta de subidas (los que ya existían se respetan).
	for (const archivo of archivosSubidos().filter((a) => !archivosAntes.includes(a))) rmSync(join(CARPETA, archivo), { force: true });
}

test.beforeAll(() => {
	archivosAntes = archivosSubidos();
});
test.afterAll(limpiar);
test.beforeEach(async ({ context }) => iniciarSesion(context));

const campoArchivo = (page: Page): Locator => page.locator('input[type="file"]');
const estadoFoto = (page: Page): Locator => page.locator('[data-foto-estado]');

async function elegirFoto(page: Page, nombre: string, buffer: Buffer): Promise<void> {
	await expect(page.locator('[data-campo-foto][data-listo]')).toBeAttached();
	await campoArchivo(page).setInputFiles({ name: nombre, mimeType: 'image/jpeg', buffer });
	await expect(estadoFoto(page)).toHaveText(/Foto lista/, { timeout: 30_000 });
}

const urlsDe = async (tarjeta: Locator): Promise<{ sm: string; lg: string }> => {
	const imagen = tarjeta.locator('img');
	const sm = (await imagen.getAttribute('src')) ?? '';
	const lg = ((await imagen.getAttribute('srcset')) ?? '').split(',')[1]?.trim().split(' ')[0] ?? '';
	return { sm, lg };
};
const nombreDeArchivo = (url: string): string => url.split('/').pop() ?? '';

let primera: { sm: string; lg: string };

test('crea un producto con una foto pesada: el navegador la comprime y se ve en la carta', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: 'Agregar producto a Churrascos' }).click();
	await page.getByLabel('Nombre', { exact: true }).fill(PRODUCTO);
	await page.getByLabel(/Precio en pesos/).fill('5000');
	await elegirFoto(page, 'plato.jpg', await fotoGrande(2000, 1500));
	// El texto de la foto se propone con el nombre del producto.
	await expect(page.getByLabel(/^Texto de la foto \(/)).toHaveValue(PRODUCTO);
	await page.getByRole('button', { name: 'Crear producto' }).click();
	await expect(page).toHaveURL(/aviso=creado$/);

	await page.goto('/');
	const tarjeta = page.locator('.producto', { hasText: PRODUCTO });
	const imagen = tarjeta.locator('img');
	await expect(imagen).toHaveAttribute('alt', PRODUCTO);
	await expect(imagen).toHaveAttribute('width', '1200');
	await expect.poll(() => imagen.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

	primera = await urlsDe(tarjeta);
	expect(primera.sm).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
	expect(primera.lg).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
	const respuesta = await page.request.get(primera.lg);
	expect(respuesta.headers()['content-type']).toContain('image/webp');
	expect((await respuesta.body()).length).toBeLessThanOrEqual(1.5 * 1024 * 1024);
	expect(archivosSubidos().filter((a) => !archivosAntes.includes(a))).toHaveLength(2);
});

test('reemplazar la foto borra los archivos de la anterior', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	await elegirFoto(page, 'otra.jpg', await fotoGrande(1000, 1000));
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);

	expect(archivosSubidos()).not.toContain(nombreDeArchivo(primera.sm));
	expect(archivosSubidos()).not.toContain(nombreDeArchivo(primera.lg));
	expect(archivosSubidos().filter((a) => !archivosAntes.includes(a))).toHaveLength(2);

	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO }).locator('img')).toHaveAttribute('width', '1000');
});

test('editar solo el texto de la foto no vuelve a subir nada', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	const antes = archivosSubidos();
	await page.getByLabel(/^Texto de la foto \(/).fill('Plato con papas y palta');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);

	expect(archivosSubidos()).toEqual(antes);
	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO }).locator('img')).toHaveAttribute('alt', 'Plato con papas y palta');
});

test('un envío con error conserva la foto recién subida', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	await elegirFoto(page, 'tercera.jpg', await fotoGrande(900, 600));
	await page.getByLabel(/Precio en pesos/).fill('cuatro mil');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();

	await expect(page.getByText(/El precio debe ser solo números/)).toBeVisible();
	// La foto subida sigue ahí: al corregir y guardar no hay que volver a elegirla.
	await expect(page.locator('[data-foto-vista]')).toBeVisible();
	await page.getByLabel(/Precio en pesos/).fill('5100');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);

	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO }).locator('img')).toHaveAttribute('width', '900');
});

test('«quitar la foto» la elimina de la carta y del almacén', async ({ page }) => {
	await page.goto('/');
	const { sm, lg } = await urlsDe(page.locator('.producto', { hasText: PRODUCTO }));

	await page.goto('/admin/carta');
	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	await page.getByLabel('Quitar la foto').check();
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);

	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO }).locator('img')).toHaveCount(0);
	expect(archivosSubidos()).not.toContain(nombreDeArchivo(sm));
	expect(archivosSubidos()).not.toContain(nombreDeArchivo(lg));
});

test('una promoción puede llevar foto y eliminarla borra los archivos', async ({ page }) => {
	await page.goto('/admin/promociones');
	await page.getByRole('link', { name: 'Agregar promoción' }).click();
	await page.getByLabel('Título', { exact: true }).fill(PROMO);
	await elegirFoto(page, 'promo.jpg', await fotoGrande(1600, 900));
	await page.getByRole('button', { name: 'Crear promoción' }).click();
	await expect(page).toHaveURL(/aviso=creada$/);

	await page.goto('/');
	const promo = page.locator('.promo', { hasText: PROMO });
	await expect(promo.locator('img')).toHaveAttribute('alt', PROMO);
	const { sm, lg } = await urlsDe(promo);
	expect(archivosSubidos()).toContain(nombreDeArchivo(lg));

	await page.goto('/admin/promociones');
	await page.getByRole('link', { name: PROMO, exact: true }).click();
	await page.locator('html[data-confirmar-listo]').waitFor({ state: 'attached' });
	await page.getByRole('button', { name: 'Eliminar promoción' }).click();
	await page.getByRole('button', { name: 'Sí, eliminar' }).click();
	await expect(page).toHaveURL(/aviso=eliminada$/);
	expect(archivosSubidos()).not.toContain(nombreDeArchivo(sm));
	expect(archivosSubidos()).not.toContain(nombreDeArchivo(lg));
});

test('la galería: agrega, ordena y elimina fotos destacadas', async ({ page }) => {
	await page.goto('/admin/fotos');
	for (const alt of ['Galeria E2E uno', 'Galeria E2E dos']) {
		await elegirFoto(page, 'galeria.jpg', await fotoGrande(1400, 900));
		await page.getByLabel(/^Texto de la foto \(/).fill(alt);
		await page.getByRole('button', { name: 'Agregar foto' }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Foto agregada.' })).toBeVisible();
	}

	await page.goto('/');
	const galeria = page.locator('.galeria img');
	await expect(galeria.filter({ hasText: '' }).locator('xpath=self::img[@alt="Galeria E2E uno"]')).toHaveCount(1);
	const alts = async () => (await page.locator('.galeria img').evaluateAll((els) => els.map((e) => e.getAttribute('alt')))).filter((a) => a?.startsWith('Galeria E2E'));
	expect(await alts()).toEqual(['Galeria E2E uno', 'Galeria E2E dos']);

	await page.goto('/admin/fotos');
	await page.getByRole('button', { name: 'Subir la foto Galeria E2E dos' }).click();
	await page.goto('/');
	expect(await alts()).toEqual(['Galeria E2E dos', 'Galeria E2E uno']);

	await page.goto('/admin/fotos');
	for (const alt of ['Galeria E2E uno', 'Galeria E2E dos']) {
		await page.locator('html[data-confirmar-listo]').waitFor({ state: 'attached' });
		await page.getByRole('button', { name: new RegExp(`Eliminar.*${alt}`) }).click();
		await page.getByRole('button', { name: 'Sí, eliminar' }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Foto eliminada.' })).toBeVisible();
	}
	await page.goto('/');
	expect(await alts()).toEqual([]);
});

test('el endpoint rechaza lo que no es una foto válida y exige sesión', async ({ context, playwright }) => {
	const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#000' } }).png().toBuffer();
	const webp = await sharp({ create: { width: 480, height: 320, channels: 3, background: '#c00' } }).webp().toBuffer();
	const webpGrande = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#c00' } }).webp().toBuffer();
	const webpOtraProporcion = await sharp({ create: { width: 480, height: 480, channels: 3, background: '#c00' } }).webp().toBuffer();
	const enviar = (api: typeof context.request, sm: Buffer, lg: Buffer) =>
		api.post('/api/admin/upload', {
			headers: { Origin: ORIGEN },
			multipart: { sm: { name: 'sm.webp', mimeType: 'image/webp', buffer: sm }, lg: { name: 'lg.webp', mimeType: 'image/webp', buffer: lg } },
		});

	const antes = archivosSubidos();
	const conSesion = context.request;
	expect((await enviar(conSesion, png, png)).status()).toBe(422);
	expect((await enviar(conSesion, webp, webpOtraProporcion)).status()).toBe(422);
	expect((await enviar(conSesion, webpGrande, webp)).status()).toBe(422); // la chica no puede ser mayor que la grande
	expect((await conSesion.post('/api/admin/upload', { headers: { Origin: ORIGEN }, multipart: { sm: 'texto' } })).status()).toBe(400);
	expect(archivosSubidos()).toEqual(antes); // nada de lo rechazado quedó guardado

	const valida = await enviar(conSesion, webp, webpGrande);
	expect(valida.status()).toBe(200);
	expect(await valida.json()).toMatchObject({ ancho: 1200, alto: 800, firma: expect.any(String) });

	const anonimo = await playwright.request.newContext({ baseURL: ORIGEN });
	expect((await enviar(anonimo, webp, webpGrande)).status()).toBe(401);
	await anonimo.dispose();
});

test('una subida con firma falsa o inventada se rechaza aunque la URL parezca válida', async ({ page }) => {
	const ajena = '/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp';
	await page.goto('/admin/producto/nuevo');
	await page.getByLabel('Nombre', { exact: true }).fill(`${PRODUCTO} falsa`);
	await page.getByLabel('Categoría').selectOption({ index: 1 });
	await expect(page.locator('[data-campo-foto][data-listo]')).toBeAttached();
	await page.locator('[data-foto-valor]').evaluate((el, url) => {
		(el as HTMLInputElement).value = JSON.stringify({ sm: url, lg: url, ancho: 1200, alto: 800, firma: 'inventada' });
	}, ajena);
	await page.getByRole('button', { name: 'Crear producto' }).click();

	await expect(page.getByText('La foto no se subió bien. Vuelve a elegirla.')).toBeVisible();
	await page.goto('/');
	await expect(page.locator('.producto', { hasText: `${PRODUCTO} falsa` })).toHaveCount(0);
});

test('las pantallas con fotos cumplen WCAG 2.2 AA', async ({ page }) => {
	for (const ruta of ['/admin/fotos', '/admin/producto/nuevo', '/admin/promocion/nuevo', '/']) {
		await page.goto(ruta);
		const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		expect(violations.map((v) => `${ruta} ${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
	}
});

test('eliminar un producto borra su foto del almacén', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	// Se mide solo lo que sube este producto (otras pruebas pueden haber dejado subidas sin asociar).
	const previos = archivosSubidos();
	await elegirFoto(page, 'ultima.jpg', await fotoGrande(800, 800));
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);
	const presentes = archivosSubidos().filter((a) => !previos.includes(a));
	expect(presentes).toHaveLength(2);

	await page.getByRole('link', { name: PRODUCTO, exact: true }).click();
	await page.locator('html[data-confirmar-listo]').waitFor({ state: 'attached' });
	await page.getByRole('button', { name: 'Eliminar producto' }).click();
	await page.getByRole('button', { name: 'Sí, eliminar' }).click();
	await expect(page).toHaveURL(/aviso=eliminado$/);

	for (const archivo of presentes) expect(archivosSubidos()).not.toContain(archivo);
});
