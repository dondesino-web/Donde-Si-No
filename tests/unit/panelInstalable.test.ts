import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface IconoManifiesto {
	src: string;
	sizes: string;
	type: string;
	purpose: string;
}
interface Manifiesto {
	name: string;
	short_name: string;
	start_url: string;
	scope: string;
	display: string;
	icons: IconoManifiesto[];
}

const leer = (ruta: string): string => readFileSync(ruta, 'utf8');
const manifiesto = JSON.parse(leer('public/panel.webmanifest')) as Manifiesto;

describe('manifiesto del panel instalable', () => {
	it('abre dentro de su propio alcance, que es el panel (si no, Chrome no ofrece instalar)', () => {
		expect(manifiesto.scope).toBe('/admin');
		expect(manifiesto.start_url.startsWith(manifiesto.scope)).toBe(true);
	});

	it('el service worker se registra con el mismo alcance que declara el manifiesto', () => {
		expect(leer('src/scripts/panelInstalable.ts')).toContain(`scope: '${manifiesto.scope}'`);
	});

	it('se muestra como app independiente con nombre corto', () => {
		expect(manifiesto.display).toBe('standalone');
		expect(manifiesto.short_name.length).toBeLessThanOrEqual(12);
	});

	it('trae íconos de 192 y 512 px y uno apto para recorte (maskable), y todos existen', () => {
		const tamanos = manifiesto.icons.map((i) => i.sizes);
		expect(tamanos).toContain('192x192');
		expect(tamanos).toContain('512x512');
		expect(manifiesto.icons.some((i) => i.purpose === 'maskable')).toBe(true);
		for (const icono of manifiesto.icons) expect(existsSync(`public${icono.src}`), icono.src).toBe(true);
	});

	it('vive fuera de /admin: el navegador lo pide sin sesión y ahí se redirigiría al login', () => {
		expect(existsSync('public/panel.webmanifest')).toBe(true);
		expect(leer('src/layouts/LayoutAdmin.astro')).toContain('href="/panel.webmanifest"');
	});
});

describe('service worker del panel', () => {
	const sw = leer('public/panel-sw.js');

	it('solo responde a navegaciones y al logo de la página sin conexión (no guarda datos del panel)', () => {
		expect(sw).toContain("request.mode === 'navigate'");
		expect(sw).not.toMatch(/cache\.put|cache\.add\(request/);
	});

	it('precarga la página sin conexión, que existe', () => {
		expect(sw).toContain("'/panel-sin-conexion.html'");
		expect(existsSync('public/panel-sin-conexion.html')).toBe(true);
	});

	it('vercel.json evita que el navegador lo cachee, para que las actualizaciones lleguen', () => {
		const config = JSON.parse(leer('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
		const regla = config.headers.find((h) => h.source === '/panel-sw.js');
		expect(regla?.headers).toContainEqual({ key: 'Cache-Control', value: 'no-cache' });
	});
});
