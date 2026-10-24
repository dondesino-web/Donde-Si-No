import { expect, test, type Page } from '@playwright/test';
import { ORIGEN, iniciarSesion } from './ayudantes.ts';

const NOMBRE = `Producto E2E ${Date.now()}`;

// Las pruebas comparten el producto que crean: se ejecutan en orden.
test.describe.configure({ mode: 'serial' });

const fila = (page: Page) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: NOMBRE, exact: true }) });
const tarjetaPublica = (page: Page) => page.locator('.producto', { hasText: NOMBRE });

test.beforeEach(async ({ context }) => iniciarSesion(context));

test('crea un producto con precio con puntos y aparece en la carta pública', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: 'Agregar producto a Churrascos' }).click();
	await page.getByLabel('Nombre', { exact: true }).fill(NOMBRE);
	await page.getByLabel('Precio en pesos').fill('4.500');
	await page.getByRole('button', { name: 'Crear producto' }).click();

	await expect(page).toHaveURL(/\/admin\/carta\?aviso=creado$/);
	await expect(page.getByRole('status')).toHaveText('Producto creado.');

	await page.goto('/');
	await expect(tarjetaPublica(page)).toContainText('$4.500');
});

test('muestra los errores sin perder lo que la persona escribió', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: 'Agregar producto a Churrascos' }).click();
	await page.getByLabel('Nombre', { exact: true }).fill('Nombre que no se debe perder');
	await page.getByLabel('Precio en pesos').fill('cuatro mil');
	await page.getByRole('button', { name: 'Crear producto' }).click();

	await expect(page.getByText('El precio debe ser solo números')).toBeVisible();
	await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nombre que no se debe perder');
	await expect(page.getByLabel('Precio en pesos')).toHaveValue('cuatro mil');
});

test('cambia el precio desde la lista y se ve en la carta pública', async ({ page }) => {
	await page.goto('/admin/carta');
	await fila(page).getByLabel(`Precio de ${NOMBRE}`).fill('5200');
	await fila(page).getByRole('button', { name: 'Guardar precio' }).click();

	await expect(page.getByRole('status')).toHaveText('Precio actualizado.');
	await page.goto('/');
	await expect(tarjetaPublica(page)).toContainText('$5.200');
});

test('marca agotado y vuelve a disponible con un toque', async ({ page }) => {
	await page.goto('/admin/carta');
	await fila(page).getByRole('switch', { name: `Disponible: ${NOMBRE}` }).click();
	await expect(page.getByRole('status')).toHaveText('Marcado como agotado.');

	await page.goto('/');
	await expect(tarjetaPublica(page)).toContainText('Agotado');

	await page.goto('/admin/carta');
	await fila(page).getByRole('switch', { name: `Disponible: ${NOMBRE}` }).click();
	await expect(page.getByRole('status')).toHaveText('Marcado como disponible.');

	await page.goto('/');
	await expect(tarjetaPublica(page)).not.toContainText('Agotado');
});

test('sube el producto una posición con el botón ↑', async ({ page }) => {
	const posicion = async () => {
		await page.goto('/');
		const nombres = await page.locator('#churrascos .producto__nombre').allTextContents();
		return nombres.indexOf(NOMBRE);
	};
	const antes = await posicion();
	expect(antes).toBeGreaterThan(0);

	await page.goto('/admin/carta');
	await page.getByRole('button', { name: 'Ordenar' }).click();
	await fila(page).getByRole('button', { name: `Subir ${NOMBRE}` }).click();

	expect(await posicion()).toBe(antes - 1);
});

test('edita el producto, lo cambia a «Consultar» y lo elimina', async ({ page }) => {
	await page.goto('/admin/carta');
	await page.getByRole('link', { name: NOMBRE, exact: true }).click();
	await page.getByLabel('Precio en pesos').fill('');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardado$/);

	await page.goto('/');
	await expect(tarjetaPublica(page)).toContainText('Consultar');

	await page.goto('/admin/carta');
	await page.getByRole('link', { name: NOMBRE, exact: true }).click();
	page.once('dialog', (dialogo) => dialogo.accept());
	await page.getByRole('button', { name: 'Eliminar producto' }).click();

	await expect(page).toHaveURL(/aviso=eliminado$/);
	await page.goto('/');
	await expect(tarjetaPublica(page)).toHaveCount(0);
});

test('sin sesión no se puede ejecutar ninguna acción del panel', async ({ playwright }) => {
	const anonimo = await playwright.request.newContext({ baseURL: ORIGEN, extraHTTPHeaders: { Origin: ORIGEN } });
	const nombre = `No debe existir ${Date.now()}`;

	const respuesta = await anonimo.post('/_actions/guardarProducto/', { multipart: { categoriaId: '1', nombreEs: nombre, precio: '100' } });

	expect(respuesta.status()).toBe(401);
	const publica = await (await anonimo.get('/')).text();
	expect(publica).not.toContain(nombre);
	await anonimo.dispose();
});
