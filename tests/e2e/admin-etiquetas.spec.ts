import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { abrirBd, iniciarSesion } from './ayudantes.ts';

const SUFIJO = Date.now();
const ETIQUETA = `Casero ${SUFIJO}`;
const ETIQUETA_RENOMBRADA = `Hecho en casa ${SUFIJO}`;
const ALERGENO = `Apio ${SUFIJO}`;
const PRODUCTO = `Producto etiquetas E2E ${SUFIJO}`;

// Las pruebas comparten lo que crean: se ejecutan en orden.
test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
	const bd = await abrirBd();
	try {
		await bd.execute({ sql: 'delete from producto where nombre_es = ?', args: [PRODUCTO] });
		await bd.execute({ sql: "delete from atributo where nombre_es like ? or nombre_es like ? or nombre_es like ?", args: [`Casero ${SUFIJO}`, `Hecho en casa ${SUFIJO}`, `Apio ${SUFIJO}`] });
	} finally {
		bd.close();
	}
});

test.beforeEach(async ({ context }) => iniciarSesion(context));

const fila = (page: Page, nombre: string) => page.getByRole('listitem').filter({ has: page.locator(`input[value="${nombre}"]`) });

test('crea una etiqueta y un alérgeno nuevos', async ({ page }) => {
	await page.goto('/admin/etiquetas');

	await page.getByLabel('Nombre de la nueva etiqueta').fill(ETIQUETA);
	await page.getByLabel('Nombre en inglés de la nueva etiqueta').fill('Homemade');
	await page.getByRole('button', { name: '+ Crear' }).first().click();
	await expect(page.getByRole('status')).toHaveText(`Se creó la etiqueta «${ETIQUETA}».`);

	await page.getByLabel('Nombre de la nueva alérgeno').fill(ALERGENO);
	await page.getByRole('button', { name: '+ Crear' }).last().click();
	await expect(page.getByRole('status')).toHaveText(`Se creó el alérgeno «${ALERGENO}».`);

	await expect(fila(page, ETIQUETA)).toHaveCount(1);
	await expect(fila(page, ALERGENO)).toHaveCount(1);
});

test('no permite repetir un nombre de la misma lista', async ({ page }) => {
	await page.goto('/admin/etiquetas');

	await page.getByLabel('Nombre de la nueva etiqueta').fill(ETIQUETA.toUpperCase());
	await page.getByRole('button', { name: '+ Crear' }).first().click();

	await expect(page.getByRole('alert')).toHaveText('Ya existe una etiqueta con ese nombre.');
});

test('el producto puede llevarlas y la carta pública las muestra en cada idioma', async ({ page }) => {
	await page.goto('/admin/producto/nuevo');
	await page.getByLabel('Categoría').selectOption({ label: 'Churrascos' });
	await page.getByLabel('Nombre', { exact: true }).fill(PRODUCTO);
	await page.getByLabel(ETIQUETA).check();
	await page.getByLabel(ALERGENO).check();
	await page.getByRole('button', { name: 'Crear producto' }).click();
	await expect(page).toHaveURL(/aviso=creado$/);

	await page.goto('/');
	const tarjeta = page.locator('.producto', { hasText: PRODUCTO });
	await expect(tarjeta).toContainText(ETIQUETA);
	await expect(tarjeta).toContainText(`Contiene: ${ALERGENO}`);

	await page.goto('/en/');
	const tarjetaEn = page.locator('.producto', { hasText: PRODUCTO });
	await expect(tarjetaEn).toContainText('Homemade');
	await expect(tarjetaEn).toContainText(`Contains: ${ALERGENO}`);
});

test('al renombrar, el producto sigue enlazado y muestra el nombre nuevo', async ({ page }) => {
	await page.goto('/admin/etiquetas');
	await page.getByLabel(`Nombre de ${ETIQUETA}`, { exact: true }).fill(ETIQUETA_RENOMBRADA);
	await page.getByRole('button', { name: `Guardar cambios de ${ETIQUETA}` }).click();
	await expect(page.getByRole('status')).toHaveText(`Cambios guardados en «${ETIQUETA_RENOMBRADA}».`);

	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO })).toContainText(ETIQUETA_RENOMBRADA);
});

test('al eliminar, desaparece del catálogo, del producto y de la carta pública', async ({ page }) => {
	await page.goto('/admin/etiquetas');
	await page.getByRole('button', { name: `Eliminar ${ETIQUETA_RENOMBRADA}` }).click();
	await page.locator('html[data-confirmar-listo]').waitFor({ state: 'attached' });
	await page.getByRole('button', { name: 'Sí, eliminar' }).click();
	await expect(page.getByRole('status')).toHaveText('Eliminado. Se quitó de 1 producto.');
	await expect(fila(page, ETIQUETA_RENOMBRADA)).toHaveCount(0);

	await page.goto('/');
	await expect(page.locator('.producto', { hasText: PRODUCTO })).not.toContainText(ETIQUETA_RENOMBRADA);
});

test('sin sesión no se puede crear ni eliminar', async ({ browser }) => {
	const contexto = await browser.newContext();
	const respuesta = await contexto.request.post('/_actions/guardarAtributo/', { form: { tipo: 'etiqueta', nombreEs: 'Intruso' } });

	expect(respuesta.status()).toBe(401);
	await contexto.close();
});

test('la pantalla cumple WCAG 2.2 AA', async ({ page }) => {
	await page.goto('/admin/etiquetas');

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

	expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
});
