import { expect, test } from '@playwright/test';
import { abrirBd, iniciarSesion } from './ayudantes.ts';

const sufijo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

async function borrarCategoria(nombre: string): Promise<void> {
	const bd = await abrirBd();
	await bd.execute({ sql: 'delete from producto where categoria_id in (select id from categoria where nombre_es = ?)', args: [nombre] });
	await bd.execute({ sql: 'delete from categoria where nombre_es = ?', args: [nombre] });
	bd.close();
}

test.describe('carga rápida', () => {
	test.beforeEach(async ({ context }) => iniciarSesion(context));

	test('sin sesión lleva al login', async ({ browser }) => {
		const contexto = await browser.newContext();
		const pagina = await contexto.newPage();

		await pagina.goto('/admin/carga-rapida');

		await expect(pagina).toHaveURL(/\/admin\/login$/);
		await contexto.close();
	});

	test('crea una categoría nueva con varios productos, con y sin precio, y se ven en la carta pública', async ({ page }) => {
		const categoria = `Rápida ${sufijo()}`;
		try {
			await page.goto('/admin/carga-rapida');
			await page.getByLabel('O escribe una categoría nueva').fill(categoria);
			await page.getByLabel('Productos').fill('Costillar prueba; 8000; Con puré\nPastel de choclo prueba; 7.500\nLasagna prueba');
			await page.getByRole('button', { name: 'Crear productos' }).click();

			await expect(page.getByRole('status')).toContainText('Se crearon 3 productos.');

			await page.goto('/');
			const seccion = page.locator('section', { has: page.getByRole('heading', { name: categoria }) });
			await expect(seccion.getByText('Costillar prueba')).toBeVisible();
			await expect(seccion.locator('.producto', { hasText: 'Costillar prueba' })).toContainText('8.000');
			await expect(seccion.locator('.producto', { hasText: 'Lasagna prueba' })).toContainText('Consultar');
		} finally {
			await borrarCategoria(categoria);
		}
	});

	test('después se pueden editar libremente desde la carta', async ({ page }) => {
		const categoria = `Editable ${sufijo()}`;
		try {
			await page.goto('/admin/carga-rapida');
			await page.getByLabel('O escribe una categoría nueva').fill(categoria);
			await page.getByLabel('Productos').fill('Plato editable; 5000');
			await page.getByRole('button', { name: 'Crear productos' }).click();
			await expect(page.getByRole('status')).toContainText('Se crearon 1 producto.');

			await page.goto('/admin/carta');
			const tarjeta = page.locator('.fila-carta', { hasText: 'Plato editable' });
			await tarjeta.getByRole('link', { name: 'Plato editable' }).click();
			await page.getByLabel('Nombre', { exact: true }).fill('Plato renombrado');
			await page.getByLabel('Precio en pesos').fill('6500');
			await page.getByRole('button', { name: /Guardar/ }).first().click();

			await expect(page.locator('.fila-carta', { hasText: 'Plato renombrado' })).toBeVisible();
		} finally {
			await borrarCategoria(categoria);
		}
	});

	test('si una línea tiene un error, indica cuál, no crea nada y conserva lo escrito', async ({ page }) => {
		const categoria = `Con error ${sufijo()}`;
		const texto = 'Bueno prueba; 1000\nMalo prueba; mil\n; 500';
		try {
			await page.goto('/admin/carga-rapida');
			await page.getByLabel('O escribe una categoría nueva').fill(categoria);
			await page.getByLabel('Productos').fill(texto);
			await page.getByRole('button', { name: 'Crear productos' }).click();

			const alerta = page.getByRole('alert').filter({ hasText: 'No se creó nada' });
			await expect(alerta).toContainText('Línea 2: el precio «mil» no es válido');
			await expect(alerta).toContainText('Línea 3: falta el nombre del producto.');
			await expect(page.getByLabel('Productos')).toHaveValue(texto);

			await page.goto('/admin/carta');
			await expect(page.getByRole('heading', { name: categoria })).toHaveCount(0);
			await expect(page.getByText('Bueno prueba')).toHaveCount(0);
		} finally {
			await borrarCategoria(categoria);
		}
	});

	test('un producto que ya existe se deja como está y se avisa', async ({ page }) => {
		const categoria = `Repetida ${sufijo()}`;
		try {
			await page.goto('/admin/carga-rapida');
			await page.getByLabel('O escribe una categoría nueva').fill(categoria);
			await page.getByLabel('Productos').fill('Café repetido; 1500');
			await page.getByRole('button', { name: 'Crear productos' }).click();
			await expect(page.getByRole('status')).toContainText('Se crearon 1 producto.');

			await page.goto('/admin/carga-rapida');
			await page.getByLabel('Categoría', { exact: true }).selectOption({ label: categoria });
			await page.getByLabel('Productos').fill('CAFÉ REPETIDO; 999\nTé repetido; 1000');
			await page.getByRole('button', { name: 'Crear productos' }).click();

			const estado = page.getByRole('status').filter({ hasText: 'Se crearon' });
			await expect(estado).toContainText('Se crearon 1 producto.');
			await expect(estado).toContainText('Ya existían y no se tocaron: CAFÉ REPETIDO.');
			await page.goto('/admin/carta');
			await expect(page.locator('.fila-carta', { hasText: 'Café repetido' })).toHaveCount(1);
			await expect(page.locator('.fila-carta', { hasText: 'Café repetido' }).locator('input[name="precio"]')).toHaveValue('1500');
		} finally {
			await borrarCategoria(categoria);
		}
	});

	test('pide elegir o escribir una categoría', async ({ page }) => {
		await page.goto('/admin/carga-rapida');
		await page.getByLabel('Productos').fill('Algo prueba; 100');
		await page.getByRole('button', { name: 'Crear productos' }).click();

		await expect(page.getByRole('alert')).toContainText('Elige una categoría o escribe el nombre de una nueva.');
	});
});
