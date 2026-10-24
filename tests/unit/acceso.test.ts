import { describe, expect, it } from 'vitest';
import { decidirAcceso, esRutaPanel } from '../../src/lib/auth/acceso.ts';

describe('decidirAcceso', () => {
	it.each(['/', '/en/', '/imprimir', '/en/print', '/robots.txt', '/sitemap.xml', '/qr', '/api/evento'])(
		'deja pasar la ruta pública %s sin sesión',
		(ruta) => {
			expect(decidirAcceso(ruta, false)).toBe('permitir');
		},
	);

	it.each(['/admin', '/admin/', '/admin/carta', '/admin/producto/3'])('redirige al login si %s se pide sin sesión', (ruta) => {
		expect(decidirAcceso(ruta, false)).toBe('login');
	});

	it.each(['/api/admin/upload', '/api/admin/lo-que-sea'])('responde 401 a la API %s sin sesión', (ruta) => {
		expect(decidirAcceso(ruta, false)).toBe('no-autorizado');
	});

	it('permite el panel y su API con sesión válida', () => {
		expect(decidirAcceso('/admin/carta', true)).toBe('permitir');
		expect(decidirAcceso('/api/admin/upload', true)).toBe('permitir');
	});

	it.each(['/_actions/guardarProducto/', '/_actions/cualquierAccionNueva', '/_ACTIONS/x', '/%5factions/x', '/_actions'])(
		'las acciones (%s) exigen sesión por defecto: una acción nueva sin guardia propia no queda abierta',
		(ruta) => {
			expect(decidirAcceso(ruta, false)).toBe('no-autorizado');
			expect(decidirAcceso(ruta, true)).toBe('permitir');
		},
	);

	it('deja entrar al login sin sesión y manda al panel si ya hay sesión', () => {
		expect(decidirAcceso('/admin/login', false)).toBe('permitir');
		expect(decidirAcceso('/admin/login', true)).toBe('panel');
	});

	it('no se deja engañar por mayúsculas, barras repetidas ni puntos', () => {
		expect(decidirAcceso('/ADMIN/carta', false)).toBe('login');
		expect(decidirAcceso('//admin/carta', false)).toBe('login');
		expect(decidirAcceso('/admin/../admin/carta', false)).toBe('login');
		expect(decidirAcceso('/admin/login/../carta', false)).toBe('login');
		expect(decidirAcceso('/API/admin/upload', false)).toBe('no-autorizado');
	});

	it('no se deja engañar por rutas codificadas (%61dmin, %2f, barras invertidas)', () => {
		expect(decidirAcceso('/%61dmin/carta', false)).toBe('login');
		expect(decidirAcceso('/admin%2fcarta', false)).toBe('login');
		expect(decidirAcceso('/%2e%2e/admin/carta', false)).toBe('login');
		expect(decidirAcceso('/admin%5ccarta', false)).toBe('login');
		expect(decidirAcceso('\\admin\\carta', false)).toBe('login');
		expect(decidirAcceso('/%2561dmin/carta', false)).toBe('login');
		expect(decidirAcceso('/api/%61dmin/upload', false)).toBe('no-autorizado');
	});

	it('trata como protegida una ruta con codificación inválida', () => {
		expect(decidirAcceso('/%zz', false)).toBe('login');
	});

	it('no confunde rutas que solo empiezan parecido', () => {
		expect(decidirAcceso('/administrador', false)).toBe('permitir');
	});
});

describe('esRutaPanel', () => {
	it('reconoce el panel y su API aunque la ruta venga codificada', () => {
		expect(esRutaPanel('/admin/login')).toBe(true);
		expect(esRutaPanel('/%61dmin')).toBe(true);
		expect(esRutaPanel('/api/admin/upload')).toBe(true);
		expect(esRutaPanel('/')).toBe(false);
		expect(esRutaPanel('/administrador')).toBe(false);
	});
});
