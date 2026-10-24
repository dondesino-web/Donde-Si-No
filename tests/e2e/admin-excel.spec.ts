import { expect, test, type Page } from '@playwright/test';
import writeExcelFile from 'write-excel-file/node';
import { leerPlanilla } from '../../src/lib/excel/leer.ts';
import { ORIGEN, abrirBd, iniciarSesion } from './ayudantes.ts';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const sufijo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type Valor = string | number | null;
async function archivoExcel(filas: Valor[][]): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
	const datos = filas.map((fila) => fila.map((valor) => (valor === null ? null : { value: valor })));
	return { name: 'carta.xlsx', mimeType: TIPO_XLSX, buffer: Buffer.from(await writeExcelFile([{ data: datos, sheet: 'Carta' }]).toBuffer()) };
}
const TITULOS = ['Categoría', 'Producto', 'Precio', 'ID (no tocar)', 'Versión (no tocar)'];

async function limpiar(categoria: string): Promise<void> {
	const bd = await abrirBd();
	await bd.execute({ sql: 'delete from producto where categoria_id in (select id from categoria where nombre_es = ?)', args: [categoria] });
	await bd.execute({ sql: 'delete from categoria where nombre_es = ?', args: [categoria] });
	bd.close();
}

const revisar = async (page: Page, archivo: Awaited<ReturnType<typeof archivoExcel>>) => {
	await page.goto('/admin/carga-rapida');
	await page.getByLabel('Planilla modificada').setInputFiles(archivo);
	await page.getByRole('button', { name: 'Revisar cambios' }).click();
};
const productosDe = async (categoria: string) => {
	const bd = await abrirBd();
	const filas = await bd.execute({ sql: 'select p.id, p.nombre_es, p.precio, p.actualizado_en from producto p join categoria c on c.id = p.categoria_id where c.nombre_es = ? order by p.orden', args: [categoria] });
	bd.close();
	return filas.rows.map((f) => ({ id: Number(f.id), nombre: String(f.nombre_es), precio: f.precio === null ? null : Number(f.precio), version: Number(f.actualizado_en) }));
};

test.describe('carga con Excel', () => {
	test.beforeEach(async ({ context }) => iniciarSesion(context));

	test('descarga la planilla con la carta actual, y se puede volver a leer', async ({ page }) => {
		const respuesta = await page.request.get('/admin/carta.xlsx');

		expect(respuesta.status()).toBe(200);
		expect(respuesta.headers()['content-type']).toBe(TIPO_XLSX);
		expect(respuesta.headers()['content-disposition']).toMatch(/^attachment; filename="Carta-Donde-Si-No-\d{4}-\d{2}-\d{2}\.xlsx"$/);
		expect(respuesta.headers()['cache-control']).toBe('no-store');
		const lectura = await leerPlanilla(new Uint8Array(await respuesta.body()));
		expect(lectura.ok && lectura.filas.some((f) => f.celdas.producto === 'Churrasco')).toBe(true);
	});

	test('sin sesión no se puede descargar la planilla', async ({ playwright }) => {
		const anonimo = await playwright.request.newContext({ baseURL: ORIGEN });

		const respuesta = await anonimo.get('/admin/carta.xlsx', { maxRedirects: 0 });

		expect(respuesta.status()).toBe(303);
		expect(respuesta.headers().location).toBe('/admin/login');
		await anonimo.dispose();
	});

	test('el botón de descarga está en la pantalla', async ({ page }) => {
		await page.goto('/admin/carga-rapida');

		await expect(page.getByRole('link', { name: 'Descargar planilla (.xlsx)' })).toHaveAttribute('href', '/admin/carta.xlsx');
	});

	test('muestra un resumen antes de guardar nada, y al confirmar crea la categoría y los productos', async ({ page }) => {
		const categoria = `Excel ${sufijo()}`;
		try {
			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Costillar prueba', 8000, null, null], [categoria, 'Lasagna prueba', null, null, null]]));

			const resultado = page.locator('[data-excel-resultado]');
			await expect(resultado).toContainText('2 productos nuevos');
			await expect(resultado).toContainText('1 categoría nueva');
			await expect(resultado).toContainText('Fila 2: Costillar prueba');
			expect(await productosDe(categoria)).toEqual([]);

			await page.getByRole('button', { name: 'Aplicar cambios' }).click();

			await expect(resultado).toContainText('Listo: 2 productos nuevos, 1 categoría nueva.');
			const guardados = await productosDe(categoria);
			expect(guardados.map((p) => [p.nombre, p.precio])).toEqual([['Costillar prueba', 8000], ['Lasagna prueba', null]]);
			await page.goto('/');
			const seccion = page.locator('section', { has: page.getByRole('heading', { name: categoria }) });
			await expect(seccion.locator('.producto', { hasText: 'Costillar prueba' })).toContainText('8.000');
		} finally {
			await limpiar(categoria);
		}
	});

	test('modifica un producto que ya existe y dice qué columna cambia', async ({ page }) => {
		const categoria = `Excel mod ${sufijo()}`;
		try {
			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Plato original', 5000, null, null]]));
			await page.getByRole('button', { name: 'Aplicar cambios' }).click();
			await expect(page.locator('[data-excel-resultado]')).toContainText('Listo');
			const [plato] = await productosDe(categoria);

			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Plato renombrado', 6500, plato!.id, plato!.version]]));

			const resultado = page.locator('[data-excel-resultado]');
			await expect(resultado).toContainText('1 producto modificado');
			await expect(resultado).toContainText('Plato renombrado (cambia Producto, Precio)');
			await page.getByRole('button', { name: 'Aplicar cambios' }).click();
			await expect(resultado).toContainText('Listo: 1 modificado.');
			expect(await productosDe(categoria)).toMatchObject([{ id: plato!.id, nombre: 'Plato renombrado', precio: 6500 }]);
		} finally {
			await limpiar(categoria);
		}
	});

	test('si hay errores indica la fila, no ofrece aplicar y no crea nada', async ({ page }) => {
		const categoria = `Excel error ${sufijo()}`;
		try {
			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Bueno', 1000, null, null], [categoria, 'Malo', 'mil', null, null]]));

			const resultado = page.locator('[data-excel-resultado]');
			await expect(resultado.getByRole('alert')).toContainText('No se aplicó nada');
			await expect(resultado).toContainText('Fila 3: el precio «mil» no es válido');
			await expect(page.getByRole('button', { name: 'Aplicar cambios' })).toHaveCount(0);
			expect(await productosDe(categoria)).toEqual([]);
		} finally {
			await limpiar(categoria);
		}
	});

	test('un producto cambiado en el panel después de descargar se omite y se avisa', async ({ page }) => {
		const categoria = `Excel conflicto ${sufijo()}`;
		try {
			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Plato en disputa', 5000, null, null]]));
			await page.getByRole('button', { name: 'Aplicar cambios' }).click();
			await expect(page.locator('[data-excel-resultado]')).toContainText('Listo');
			const [plato] = await productosDe(categoria);

			// La planilla se «descargó» hace 10 minutos y el producto cambió en el panel desde entonces.
			await revisar(page, await archivoExcel([TITULOS, [categoria, 'Plato en disputa', 9999, plato!.id, plato!.version - 600]]));

			const resultado = page.locator('[data-excel-resultado]');
			await expect(resultado).toContainText('cambió en el panel después de descargar la planilla');
			await expect(resultado).toContainText('La planilla no tiene cambios');
			expect((await productosDe(categoria))[0]?.precio).toBe(5000);
		} finally {
			await limpiar(categoria);
		}
	});

	test('rechaza un archivo que no es Excel', async ({ page }) => {
		await page.goto('/admin/carga-rapida');
		await page.getByLabel('Planilla modificada').setInputFiles({ name: 'carta.csv', mimeType: 'text/csv', buffer: Buffer.from('Categoría;Producto\nBebidas;Té') });
		await page.getByRole('button', { name: 'Revisar cambios' }).click();

		await expect(page.locator('[data-excel-resultado]')).toContainText('El archivo debe ser un Excel (.xlsx)');
	});

	test('rechaza un .xlsx falso', async ({ page }) => {
		await page.goto('/admin/carga-rapida');
		await page.getByLabel('Planilla modificada').setInputFiles({ name: 'carta.xlsx', mimeType: TIPO_XLSX, buffer: Buffer.from('esto no es un excel') });
		await page.getByRole('button', { name: 'Revisar cambios' }).click();

		await expect(page.locator('[data-excel-resultado]')).toContainText('No se pudo leer el archivo');
	});

	test('las acciones de la planilla exigen sesión', async ({ playwright }) => {
		const anonimo = await playwright.request.newContext({ baseURL: ORIGEN, extraHTTPHeaders: { Origin: ORIGEN } });
		const archivo = await archivoExcel([TITULOS, ['Cat anónima', 'No debe existir', 1, null, null]]);

		for (const accion of ['revisarPlanilla', 'aplicarPlanilla']) {
			const respuesta = await anonimo.post(`/_actions/${accion}/`, { multipart: { archivo: { name: archivo.name, mimeType: archivo.mimeType, buffer: archivo.buffer } } });
			expect(respuesta.status(), accion).toBe(401);
		}
		await anonimo.dispose();
	});
});
