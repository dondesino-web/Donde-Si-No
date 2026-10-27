import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { abrirBd, iniciarSesion } from './ayudantes.ts';

const SUFIJO = Date.now();
const PROMO = `Promo E2E ${SUFIJO}`;
const MENU = `Menú E2E ${SUFIJO}`;

// Comparten el estado que crean (promoción y menú único): se ejecutan en orden.
test.describe.configure({ mode: 'serial' });

// Deja la base como estaba: el menú del día es una sola fila y las pruebas la crean.
async function limpiar(): Promise<void> {
	const cliente = await abrirBd();
	try {
		await cliente.execute("delete from promocion where titulo_es like 'Promo E2E%'");
		await cliente.execute("delete from menu_dia where titulo_es like 'Menú E2E%'");
	} finally {
		cliente.close();
	}
}

test.beforeAll(limpiar);
test.afterAll(limpiar);
test.beforeEach(async ({ context }) => iniciarSesion(context));

const fila = (page: Page, nombre = PROMO) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: nombre, exact: true }) });
const promoPublica = (page: Page) => page.locator('.promo', { hasText: PROMO });

async function crearPromocion(page: Page, campos: { titulo: string; precio?: string; desde?: string; hasta?: string }): Promise<void> {
	await page.goto('/admin/promociones');
	await page.getByRole('link', { name: 'Agregar promoción' }).click();
	await page.getByLabel('Título', { exact: true }).fill(campos.titulo);
	if (campos.precio) await page.getByLabel(/Precio en pesos/).fill(campos.precio);
	if (campos.desde) await page.getByLabel('Desde').fill(campos.desde);
	if (campos.hasta) await page.getByLabel(/Hasta/).fill(campos.hasta);
	await page.getByRole('button', { name: 'Crear promoción' }).click();
}

test('crea una promoción activa y se ve en la carta pública', async ({ page }) => {
	await crearPromocion(page, { titulo: PROMO, precio: '6.990' });

	await expect(page).toHaveURL(/\/admin\/promociones\?aviso=creada$/);
	await expect(page.getByRole('status')).toHaveText('Promoción creada.');
	await expect(fila(page)).toContainText('Se muestra en la carta');

	await page.goto('/');
	await expect(promoPublica(page)).toContainText('$6.990');
});

test('apagarla y activarla la quita y la devuelve a la carta', async ({ page }) => {
	await page.goto('/admin/promociones');
	await fila(page).getByRole('button', { name: /Apagar/ }).click();
	await expect(page.getByRole('status')).toHaveText('Promoción desactivada.');
	await expect(fila(page)).toContainText('Apagada');

	await page.goto('/');
	await expect(promoPublica(page)).toHaveCount(0);

	await page.goto('/admin/promociones');
	await fila(page).getByRole('button', { name: /Activar/ }).click();
	// Se espera el aviso: navegar de inmediato cancelaría el envío que todavía está en curso.
	await expect(page.getByRole('status')).toHaveText('Promoción activada.');
	await page.goto('/');
	await expect(promoPublica(page)).toHaveCount(1);
});

test('rechaza fechas incoherentes y conserva lo escrito', async ({ page }) => {
	await crearPromocion(page, { titulo: `${PROMO} fechas`, desde: '2026-10-20', hasta: '2026-10-10' });

	await expect(page.getByText(/no puede ser anterior/)).toBeVisible();
	await expect(page.getByLabel('Título', { exact: true })).toHaveValue(`${PROMO} fechas`);
	await expect(page.getByLabel('Desde')).toHaveValue('2026-10-20');
});

test('una promoción programada o vencida se explica en el panel y no aparece en la carta', async ({ page }) => {
	await crearPromocion(page, { titulo: `${PROMO} futura`, desde: '2099-01-01' });
	await crearPromocion(page, { titulo: `${PROMO} vieja`, hasta: '2000-01-01' });

	await expect(fila(page, `${PROMO} futura`)).toContainText('Programada');
	await expect(fila(page, `${PROMO} vieja`)).toContainText('Vencida');

	await page.goto('/');
	await expect(page.locator('.promo', { hasText: `${PROMO} futura` })).toHaveCount(0);
	await expect(page.locator('.promo', { hasText: `${PROMO} vieja` })).toHaveCount(0);
});

test('guarda el menú del día y se ve en español e inglés', async ({ page }) => {
	await page.goto('/admin/menu-del-dia');
	await page.getByLabel('Título', { exact: true }).fill(MENU);
	await page.getByLabel('Título en inglés').fill(`${MENU} (EN)`);
	await page.getByLabel(/Detalle \(/).fill('Ensalada\nPostre');
	await page.getByLabel(/Precio en pesos/).fill('4990');
	await page.getByRole('button', { name: 'Guardar menú del día' }).click();

	await expect(page.getByRole('status')).toHaveText('Menú del día guardado.');
	await expect(page.getByText('Se muestra hoy en la carta.')).toBeVisible();

	await page.goto('/');
	await expect(page.locator('.menu-dia')).toContainText(MENU);
	await expect(page.locator('.menu-dia')).toContainText('$4.990');
	await page.goto('/en/');
	await expect(page.locator('.menu-dia')).toContainText(`${MENU} (EN)`);
});

test('un menú con fecha pasada no se muestra y el panel lo explica', async ({ page }) => {
	await page.goto('/admin/menu-del-dia');
	await page.getByLabel(/Día en que se muestra/).fill('2000-01-01');
	await page.getByRole('button', { name: 'Guardar menú del día' }).click();

	await expect(page.getByText(/La fecha ya pasó/)).toBeVisible();
	await page.goto('/');
	await expect(page.locator('.menu-dia')).toHaveCount(0);
});

test('la carta pública con promoción y menú sigue cumpliendo WCAG 2.2 AA', async ({ page }) => {
	await page.goto('/admin/menu-del-dia');
	await page.getByLabel(/Día en que se muestra/).fill('');
	await page.getByRole('button', { name: 'Guardar menú del día' }).click();
	await expect(page.getByText('Se muestra hoy en la carta.')).toBeVisible();

	for (const ruta of ['/', '/en/']) {
		await page.goto(ruta);
		await expect(page.locator('.menu-dia')).toBeVisible();
		const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
	}
});

test('edita y elimina la promoción', async ({ page }) => {
	await page.goto('/admin/promociones');
	await page.getByRole('link', { name: PROMO, exact: true }).click();
	await page.getByLabel(/Precio en pesos/).fill('');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/aviso=guardada$/);

	await page.getByRole('link', { name: PROMO, exact: true }).click();
	await page.locator('html[data-confirmar-listo]').waitFor({ state: 'attached' });
	await page.getByRole('button', { name: 'Eliminar promoción' }).click();
	await page.getByRole('button', { name: 'Sí, eliminar' }).click();

	await expect(page).toHaveURL(/aviso=eliminada$/);
	await expect(page.getByRole('link', { name: PROMO, exact: true })).toHaveCount(0);
});

test('sin sesión no se pueden guardar promociones ni el menú', async ({ playwright }) => {
	const anonimo = await playwright.request.newContext({ baseURL: 'http://localhost:4399', extraHTTPHeaders: { Origin: 'http://localhost:4399' } });

	const promo = await anonimo.post('/_actions/guardarPromocion/', { multipart: { tituloEs: `${PROMO} anonima` } });
	const menu = await anonimo.post('/_actions/guardarMenuDia/', { multipart: { tituloEs: `${MENU} anonimo` } });

	expect([promo.status(), menu.status()]).toEqual([401, 401]);
	await anonimo.dispose();
});
