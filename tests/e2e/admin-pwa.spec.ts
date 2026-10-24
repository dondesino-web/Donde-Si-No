import { expect, test } from '@playwright/test';
import { iniciarSesion } from './ayudantes.ts';

test('el manifiesto y el service worker se piden sin sesión (no los frena el login)', async ({ request }) => {
	const manifiesto = await request.get('/panel.webmanifest', { maxRedirects: 0 });
	expect(manifiesto.status()).toBe(200);
	expect((await manifiesto.json()).scope).toBe('/admin');

	const sw = await request.get('/panel-sw.js', { maxRedirects: 0 });
	expect(sw.status()).toBe(200);
});

test('el login también enlaza el manifiesto, para poder instalar antes de entrar', async ({ page }) => {
	await page.goto('/admin/login');

	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/panel.webmanifest');
});

test('el panel registra su service worker con alcance /admin', async ({ page, context }) => {
	await iniciarSesion(context);
	await page.goto('/admin');

	const alcance = await page.evaluate(async () => {
		const registro = await navigator.serviceWorker.ready;
		return new URL(registro.scope).pathname;
	});
	expect(alcance).toBe('/admin');
});

test('el botón de instalar no se muestra si el navegador no ofrece instalar', async ({ page, context }) => {
	await iniciarSesion(context);
	await page.goto('/admin');

	await expect(page.getByRole('heading', { name: 'Movimiento de la carta' })).toBeVisible();
	await expect(page.locator('#instalar-app')).toBeHidden();
});

test('con el evento de instalación del navegador aparece el botón y se puede pulsar', async ({ page, context }) => {
	await iniciarSesion(context);
	await page.goto('/admin');
	await page.waitForFunction(() => document.querySelector('#instalar-app') !== null);

	await page.evaluate(() => {
		const evento = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
		evento.prompt = async () => {};
		evento.userChoice = Promise.resolve({ outcome: 'accepted' });
		window.dispatchEvent(evento);
	});

	await expect(page.getByRole('button', { name: 'Instalar app' })).toBeVisible();
	await page.getByRole('button', { name: 'Instalar app' }).click();
	await expect(page.locator('#instalar-estado')).toContainText('busca «Panel»');
	await expect(page.getByRole('button', { name: 'Instalar app' })).toBeHidden();
});
