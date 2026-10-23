import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ORIGEN, abrirBd, iniciarSesion } from './ayudantes.ts';

// Un navegador de persona: el servidor descarta los robots (y «HeadlessChrome» lo es).
const NAVEGADOR =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

test.describe.configure({ mode: 'serial' });

type Fila = { fecha: string; evento: string; conteo: number };
let respaldo: Fila[] = [];

async function conteoDe(evento: string): Promise<number> {
	const cliente = await abrirBd();
	try {
		const { rows } = await cliente.execute({ sql: 'select coalesce(sum(conteo), 0) as n from estadistica_diaria where evento = ?', args: [evento] });
		return Number(rows[0].n);
	} finally {
		cliente.close();
	}
}

// Las pruebas suman contadores en la base local: se respaldan y se restauran para no dejar estadísticas inventadas.
test.beforeAll(async () => {
	const cliente = await abrirBd();
	try {
		const { rows } = await cliente.execute('select fecha, evento, conteo from estadistica_diaria');
		respaldo = rows.map((fila) => ({ fecha: String(fila.fecha), evento: String(fila.evento), conteo: Number(fila.conteo) }));
	} finally {
		cliente.close();
	}
});

test.afterAll(async () => {
	const cliente = await abrirBd();
	try {
		await cliente.execute('delete from estadistica_diaria');
		for (const { fecha, evento, conteo } of respaldo) {
			await cliente.execute({ sql: 'insert into estadistica_diaria (fecha, evento, conteo) values (?, ?, ?)', args: [fecha, evento, conteo] });
		}
	} finally {
		cliente.close();
	}
});

const enviarEvento = (request: Page['request'], cuerpo: string, cabeceras: Record<string, string> = {}) =>
	request.post(`${ORIGEN}/api/evento`, { data: cuerpo, headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': NAVEGADOR, Origin: ORIGEN, ...cabeceras } });

test.describe('/qr', () => {
	test('cuenta el escaneo y redirige a la carta', async ({ request }) => {
		const antes = await conteoDe('qr_escaneo');

		const respuesta = await request.get(`${ORIGEN}/qr`, { maxRedirects: 0, headers: { 'User-Agent': NAVEGADOR } });

		expect(respuesta.status()).toBe(302);
		expect(respuesta.headers().location).toBe('/');
		expect(respuesta.headers()['cache-control']).toBe('no-store');
		expect(await conteoDe('qr_escaneo')).toBe(antes + 1);
	});

	test('redirige igual pero no cuenta robots, previsualizaciones ni precargas', async ({ request }) => {
		const antes = await conteoDe('qr_escaneo');

		const casos: Record<string, string>[] = [
			{ 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
			{ 'User-Agent': 'WhatsApp/2.23.20.0 A' },
			{ 'User-Agent': NAVEGADOR, 'Sec-Purpose': 'prefetch' },
			{ 'User-Agent': 'curl/8.4.0' },
		];
		for (const cabeceras of casos) {
			const respuesta = await request.get(`${ORIGEN}/qr`, { maxRedirects: 0, headers: cabeceras });
			expect(respuesta.status()).toBe(302);
		}

		expect(await conteoDe('qr_escaneo')).toBe(antes);
	});

	test('una consulta HEAD (comprobar el enlace) no cuenta', async ({ request }) => {
		const antes = await conteoDe('qr_escaneo');

		const respuesta = await request.head(`${ORIGEN}/qr`, { maxRedirects: 0, headers: { 'User-Agent': NAVEGADOR } });

		expect(respuesta.status()).toBe(302);
		expect(await conteoDe('qr_escaneo')).toBe(antes);
	});

	test('no cuenta las visitas de quien administra (con sesión)', async ({ context }) => {
		await iniciarSesion(context);
		const antes = await conteoDe('qr_escaneo');

		const respuesta = await context.request.get(`${ORIGEN}/qr`, { maxRedirects: 0, headers: { 'User-Agent': NAVEGADOR } });

		expect(respuesta.status()).toBe(302);
		expect(await conteoDe('qr_escaneo')).toBe(antes);
	});
});

test.describe('/api/evento', () => {
	test('registra un evento válido del propio sitio', async ({ request }) => {
		const antes = await conteoDe('clic_mapa');

		const respuesta = await enviarEvento(request, 'clic_mapa');

		expect(respuesta.status()).toBe(204);
		expect(await conteoDe('clic_mapa')).toBe(antes + 1);
	});

	test('rechaza lo que no es un evento de la lista y no cuenta nada', async ({ request }) => {
		const antes = await conteoDe('visita');

		for (const cuerpo of ['', 'otro', '{"evento":"visita"}', 'visita;drop table producto', 'x'.repeat(100)]) {
			expect((await enviarEvento(request, cuerpo)).status(), cuerpo).toBe(400);
		}
		expect((await enviarEvento(request, 'x'.repeat(5000))).status()).toBe(413);

		expect(await conteoDe('visita')).toBe(antes);
	});

	test('un navegador no puede sumar escaneos del QR', async ({ request }) => {
		const antes = await conteoDe('qr_escaneo');

		expect((await enviarEvento(request, 'qr_escaneo')).status()).toBe(400);

		expect(await conteoDe('qr_escaneo')).toBe(antes);
	});

	test('rechaza peticiones de otro sitio o sin origen', async ({ request }) => {
		const antes = await conteoDe('visita');

		expect((await enviarEvento(request, 'visita', { Origin: 'https://evil.com' })).status()).toBe(403);
		expect((await enviarEvento(request, 'visita', { Origin: 'null' })).status()).toBe(403);
		// Sin `Origin` y sin `Sec-Fetch-Site` (un script de línea de comandos): también se rechaza.
		const sinOrigen = await request.post(`${ORIGEN}/api/evento`, { data: 'visita', headers: { 'Content-Type': 'text/plain', 'User-Agent': NAVEGADOR } });
		expect(sinOrigen.status()).toBe(403);

		expect(await conteoDe('visita')).toBe(antes);
	});

	test('responde 204 a los robots pero no los cuenta', async ({ request }) => {
		const antes = await conteoDe('visita');

		const respuesta = await enviarEvento(request, 'visita', { 'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0)' });

		expect(respuesta.status()).toBe(204);
		expect(await conteoDe('visita')).toBe(antes);
	});

	test('no cuenta los eventos de quien administra (con sesión)', async ({ context }) => {
		await iniciarSesion(context);
		const antes = await conteoDe('visita');

		const respuesta = await context.request.post(`${ORIGEN}/api/evento`, {
			data: 'visita',
			headers: { 'Content-Type': 'text/plain', 'User-Agent': NAVEGADOR, Origin: ORIGEN },
		});

		expect(respuesta.status()).toBe(204);
		expect(await conteoDe('visita')).toBe(antes);
	});

	test('un cuerpo enorme sin Content-Length se corta con 413 sin contar nada', async ({ request }) => {
		const antes = await conteoDe('visita');

		const respuesta = await request.post(`${ORIGEN}/api/evento`, {
			data: Buffer.alloc(200_000, 97),
			headers: { 'Content-Type': 'text/plain', 'User-Agent': NAVEGADOR, Origin: ORIGEN },
		});

		expect(respuesta.status()).toBe(413);
		expect(await conteoDe('visita')).toBe(antes);
	});

	test('no usa cookies', async ({ request }) => {
		const respuesta = await enviarEvento(request, 'visita');

		expect(respuesta.headers()['set-cookie']).toBeUndefined();
	});
});

test.describe('la carta envía los eventos', () => {
	test.use({ userAgent: NAVEGADOR });

	// Las pruebas automáticas se identifican (`navigator.webdriver`) y la carta no las cuenta: aquí se oculta a propósito.
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
	});

	test('cuenta la visita al abrirla y el clic en compartir', async ({ page }) => {
		const visitas = await conteoDe('visita');
		const peticionVisita = page.waitForRequest((r) => r.url().endsWith('/api/evento') && r.postData() === 'visita');
		await page.goto('/');
		await peticionVisita;
		await expect.poll(() => conteoDe('visita')).toBe(visitas + 1);

		const compartidos = await conteoDe('clic_compartir');
		const peticionClic = page.waitForRequest((r) => r.url().endsWith('/api/evento') && r.postData() === 'clic_compartir');
		await page.getByRole('button', { name: 'Compartir' }).click();
		await peticionClic;
		await expect.poll(() => conteoDe('clic_compartir')).toBe(compartidos + 1);
	});

	test('cuenta el cambio a inglés, pero no el cambio a español', async ({ page }) => {
		const ingles = await conteoDe('idioma_en');
		await page.goto('/');
		await page.getByRole('link', { name: 'English: view the menu in English' }).click();
		await expect(page).toHaveURL(/\/en\/$/);
		await expect.poll(() => conteoDe('idioma_en')).toBe(ingles + 1);

		await page.getByRole('link', { name: 'Español: ver la carta en español' }).click();
		await expect(page).toHaveURL(/localhost:\d+\/$/);
		await page.waitForTimeout(500);
		expect(await conteoDe('idioma_en')).toBe(ingles + 1);
	});

	test('la versión imprimible no cuenta visitas', async ({ page }) => {
		const antes = await conteoDe('visita');
		await page.goto('/imprimir');
		await page.waitForTimeout(500);

		expect(await conteoDe('visita')).toBe(antes);
	});
});

test.describe('panel', () => {
	test.beforeEach(async ({ context }) => iniciarSesion(context));

	test('el inicio muestra el movimiento de hoy y de la semana', async ({ page }) => {
		await page.goto('/admin');

		await expect(page.getByRole('heading', { name: 'Movimiento de la carta' })).toBeVisible();
		await expect(page.getByRole('row', { name: /Escaneos del QR/ })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Código QR y tarjeta para mesas' })).toBeVisible();
	});

	test('las estadísticas muestran el periodo pedido y rechazan valores raros', async ({ page }) => {
		await page.goto('/admin/estadisticas');
		await expect(page.getByRole('heading', { name: 'Resumen de los últimos 7 días' })).toBeVisible();
		await expect(page.locator('tbody tr')).toHaveCount(7);

		await page.getByRole('link', { name: 'Últimos 30 días' }).click();
		await expect(page.locator('tbody tr')).toHaveCount(30);

		for (const valor of ['9999', '-1', 'abc', '7;drop', '1e1']) {
			await page.goto(`/admin/estadisticas?dias=${encodeURIComponent(valor)}`);
			await expect(page.locator('tbody tr')).toHaveCount(7);
		}
	});

	test('una visita de la prueba aparece en la tabla de hoy', async ({ page, request }) => {
		await enviarEvento(request, 'clic_resena');
		await page.goto('/admin/estadisticas');

		const fila = page.locator('tbody tr').first(); // el día más reciente primero
		const columna = (await page.locator('thead th').allTextContents()).indexOf('Reseña');
		expect(Number(await fila.locator('td').nth(columna - 1).textContent())).toBeGreaterThanOrEqual(1);
	});

	test('el QR se muestra y se puede descargar en SVG', async ({ page, context }) => {
		await page.goto('/admin/qr');
		await expect(page.getByRole('heading', { name: 'Código QR de la carta' })).toBeVisible();
		await expect(page.getByText('https://www.donde-sino.com/qr').first()).toBeVisible();

		const imagen = page.getByRole('img', { name: /Código QR que lleva a la carta/ });
		await expect.poll(() => imagen.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

		const svg = await context.request.get(`${ORIGEN}/admin/qr/codigo.svg?descargar=1`);
		expect(svg.headers()['content-type']).toContain('image/svg+xml');
		expect(svg.headers()['content-disposition']).toContain('attachment');
		expect(await svg.text()).toContain('<svg');
	});

	test('se puede descargar el QR en PNG desde el navegador', async ({ page }) => {
		await page.goto('/admin/qr');

		const descarga = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Descargar en PNG' }).click();
		const archivo = await descarga;

		expect(archivo.suggestedFilename()).toBe('qr-donde-si-no.png');
		const ruta = await archivo.path();
		const { readFileSync } = await import('node:fs');
		const cabecera = readFileSync(ruta).subarray(0, 8);
		expect([...cabecera]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	});

	test('la tarjeta de mesa se arma con una o cuatro tarjetas y solo acepta esas cantidades', async ({ page }) => {
		await page.goto('/admin/qr/tarjeta?por=4');
		await expect(page.locator('.tarjeta')).toHaveCount(4);

		await page.goto('/admin/qr/tarjeta?por=1');
		await expect(page.locator('.tarjeta')).toHaveCount(1);
		await expect(page.locator('.tarjeta')).toContainText('Scan to see our menu');

		for (const valor of ['500', '0', '-3', 'abc']) {
			await page.goto(`/admin/qr/tarjeta?por=${encodeURIComponent(valor)}`);
			await expect(page.locator('.tarjeta')).toHaveCount(1);
		}
	});

	test('las pantallas nuevas cumplen WCAG 2.2 AA', async ({ page }) => {
		for (const ruta of ['/admin', '/admin/estadisticas', '/admin/estadisticas?dias=30', '/admin/qr', '/admin/qr/tarjeta?por=4']) {
			await page.goto(ruta);
			const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
			expect(violations.map((v) => `${ruta} ${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
		}
	});

	test('sin sesión, ni el QR ni las estadísticas son accesibles', async ({ playwright }) => {
		const anonimo = await playwright.request.newContext({ baseURL: ORIGEN });

		for (const ruta of ['/admin/estadisticas', '/admin/qr', '/admin/qr/codigo.svg', '/admin/qr/tarjeta']) {
			const respuesta = await anonimo.get(ruta, { maxRedirects: 0 });
			expect(respuesta.status(), ruta).toBe(303);
		}
		await anonimo.dispose();
	});
});
