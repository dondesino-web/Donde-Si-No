import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGINAS = [
	{ nombre: 'carta-es', ruta: '/', lang: 'es-CL' },
	{ nombre: 'carta-en', ruta: '/en/', lang: 'en' },
	{ nombre: 'imprimir-es', ruta: '/imprimir', lang: 'es-CL' },
	{ nombre: 'imprimir-en', ruta: '/en/print', lang: 'en' },
];
const ANCHOS = [320, 375, 768, 1024, 1440];

for (const pagina of PAGINAS) {
	test.describe(pagina.nombre, () => {
		test('declara el idioma y tiene un solo h1', async ({ page }) => {
			await page.goto(pagina.ruta);

			await expect(page.locator('html')).toHaveAttribute('lang', pagina.lang);
			await expect(page.locator('h1')).toHaveCount(1);
		});

		test('no tiene violaciones de accesibilidad WCAG 2.2 AA', async ({ page }) => {
			await page.goto(pagina.ruta);

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();

			expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
		});

		for (const ancho of ANCHOS) {
			test(`se ve bien a ${ancho}px (sin scroll horizontal)`, async ({ page }) => {
				await page.setViewportSize({ width: ancho, height: 900 });
				await page.goto(pagina.ruta);

				const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
				expect(desborde).toBeLessThanOrEqual(0);

				await page.screenshot({ path: `test-results/capturas/${pagina.nombre}-${ancho}.png`, fullPage: true });
			});
		}
	});
}

test('el enlace «saltar» lleva el foco al contenido', async ({ page }) => {
	await page.goto('/');
	await page.keyboard.press('Tab');

	const saltar = page.locator('.saltar-contenido');
	await expect(saltar).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#contenido$/);
});

test('el botón de idioma cambia entre español e inglés', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'English: view the menu in English' }).click();
	await expect(page).toHaveURL(/\/en\/$/);

	await page.getByRole('link', { name: 'Español: ver la carta en español' }).click();
	await expect(page).toHaveURL(/localhost:\d+\/$/);
});
