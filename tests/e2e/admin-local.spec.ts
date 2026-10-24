import type { Client, InValue } from '@libsql/client';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ORIGEN, abrirBd, iniciarSesion } from './ayudantes.ts';

// Estas pruebas modifican la única fila del local: se respalda y se restaura al terminar.
let respaldo: Record<string, InValue> | undefined;

async function conBase<T>(accion: (cliente: Client) => Promise<T>): Promise<T> {
	const cliente = await abrirBd();
	try {
		return await accion(cliente);
	} finally {
		cliente.close();
	}
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
	respaldo = await conBase(async (cliente) => {
		const { columns, rows } = await cliente.execute('select * from negocio where id = 1');
		return Object.fromEntries(columns.map((columna) => [columna, rows[0][columna] as InValue]));
	});
});

test.afterAll(async () => {
	if (!respaldo) return;
	const columnas = Object.keys(respaldo).filter((c) => c !== 'id');
	await conBase((cliente) =>
		cliente.execute({
			sql: `update negocio set ${columnas.map((c) => `${c} = ?`).join(', ')} where id = 1`,
			args: columnas.map((c) => respaldo![c]),
		}),
	);
});

test.beforeEach(async ({ context }) => iniciarSesion(context));

test('guarda horario, contacto, redes y servicios, y todo se ve en la carta pública', async ({ page }) => {
	await page.goto('/admin/local');
	await page.getByLabel('Teléfono').fill('9 8886-0939');
	await page.getByLabel(/^WhatsApp/).fill('+56 9 1234 5678');
	await page.getByLabel('Instagram').fill('https://www.instagram.com/dondesino_e2e');
	await page.getByLabel('Wi-Fi').uncheck();
	// Abierto las 24 horas (de lunes a domingo) para que el estado «Abierto ahora» no dependa de la hora de la prueba.
	await page.getByLabel('Abre', { exact: true }).first().fill('00:00');
	await page.getByLabel('Cierra', { exact: true }).first().fill('23:59');
	await page.getByRole('button', { name: 'Copiar el horario del lunes a todos los días' }).click();
	await page.getByRole('button', { name: 'Guardar datos del local' }).click();

	await expect(page.getByRole('status')).toHaveText('Datos del local guardados.');

	await page.goto('/');
	const pie = page.locator('footer');
	await expect(pie).toContainText('lunes a domingo');
	await expect(pie).toContainText('00:00–23:59');
	await expect(pie.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/dondesino_e2e');
	await expect(pie.getByRole('link', { name: '+56 9 8886 0939' })).toHaveAttribute('href', 'tel:+56988860939');
	await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/56912345678');
	await expect(pie.getByText('Wi-Fi', { exact: true })).toHaveCount(0);
	await expect(pie.getByText('Para llevar')).toBeVisible();
	// El estado lo calcula el navegador con la hora de Chile.
	await expect(page.locator('#estado-apertura')).toHaveText(/Abierto ahora/);

	const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
	expect(ld.sameAs).toContain('https://www.instagram.com/dondesino_e2e');
	expect(ld.openingHoursSpecification).toHaveLength(7);
	expect(ld.telephone).toBe('+56988860939');
});

test('la versión en inglés también muestra el horario con los días en inglés', async ({ page }) => {
	await page.goto('/en/');

	await expect(page.locator('footer')).toContainText('Monday to Sunday');
});

test('muestra los errores del formulario sin perder lo escrito ni guardar nada', async ({ page }) => {
	await page.goto('/admin/local');
	await page.getByLabel('Facebook').fill('javascript:alert(1)');
	await page.getByLabel('Instagram').fill('http://www.instagram.com/inseguro');
	// Miércoles con hora de apertura y sin hora de cierre (el horario guardado antes lo traía completo).
	await page.getByLabel('Abre', { exact: true }).nth(2).fill('12:00');
	await page.getByLabel('Cierra', { exact: true }).nth(2).fill('');
	await page.getByRole('button', { name: 'Guardar datos del local' }).click();

	await expect(page.getByRole('alert').first()).toContainText('no se guardó nada');
	await expect(page.getByText(/empiece con https:\/\//).first()).toBeVisible();
	await expect(page.getByText('Indica la hora de apertura y la de cierre.')).toBeVisible();
	await expect(page.getByLabel('Instagram')).toHaveValue('http://www.instagram.com/inseguro');

	await page.goto('/');
	await expect(page.locator('footer').getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/dondesino_e2e');
});

test('rechaza coordenadas incompletas y teléfonos inválidos', async ({ page }) => {
	await page.goto('/admin/local');
	await page.getByLabel('Teléfono').fill('123');
	await page.getByLabel(/Latitud/).fill('-33.7');
	await page.getByRole('button', { name: 'Guardar datos del local' }).click();

	await expect(page.getByText(/El teléfono no es válido/)).toBeVisible();
	await expect(page.getByText(/indica también la longitud/)).toBeVisible();
});

test('un formulario muy lleno con un error no pierde lo escrito (el resultado puede viajar en una cookie)', async ({ page }) => {
	const largo = 'ñ'.repeat(590);
	const enlaceLargo = (sitio: string) => `https://${sitio}/${'a'.repeat(250)}`;
	await page.goto('/admin/local');
	await page.getByLabel(/^Descripción \(/).fill(largo);
	await page.getByLabel('Descripción en inglés').fill(largo);
	await page.getByLabel('Instagram').fill(enlaceLargo('www.instagram.com'));
	await page.getByLabel('Facebook').fill(enlaceLargo('www.facebook.com'));
	await page.getByLabel('Uber Eats').fill(enlaceLargo('www.ubereats.com'));
	await page.getByLabel('Teléfono').fill('123');
	await page.getByRole('button', { name: 'Guardar datos del local' }).click();

	await expect(page.getByText(/El teléfono no es válido/)).toBeVisible();
	await expect(page.getByLabel(/^Descripción \(/)).toHaveValue(largo);
	await expect(page.getByLabel('Descripción en inglés')).toHaveValue(largo);
	await expect(page.getByLabel('Instagram')).toHaveValue(enlaceLargo('www.instagram.com'));
});

test('rechaza enlaces a páginas que cualquiera puede publicar o que redirigen', async ({ page }) => {
	await page.goto('/admin/local');
	await page.getByLabel(/Enlace de «Cómo llegar»/).fill('https://sites.google.com/view/phishing');
	await page.getByLabel(/Enlace para dejar una reseña/).fill('https://www.google.com/url?q=https://evil.com');
	await page.getByRole('button', { name: 'Guardar datos del local' }).click();

	await expect(page.getByText(/sea de Google/)).toHaveCount(2);
});

test('la pantalla del local y la carta pública cumplen WCAG 2.2 AA', async ({ page }) => {
	for (const ruta of ['/admin/local', '/', '/en/']) {
		await page.goto(ruta);
		const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		expect(violations.map((v) => `${ruta} ${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
	}
});

test('sin sesión no se pueden guardar los datos del local', async ({ playwright }) => {
	const anonimo = await playwright.request.newContext({ baseURL: ORIGEN, extraHTTPHeaders: { Origin: ORIGEN } });

	const respuesta = await anonimo.post('/_actions/guardarLocal/', {
		multipart: { direccion: 'Calle falsa 123', comuna: 'X', region: 'Y', instagramUrl: 'https://www.instagram.com/anonimo' },
	});

	expect(respuesta.status()).toBe(401);
	await anonimo.dispose();
});
