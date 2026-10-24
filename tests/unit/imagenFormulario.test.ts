import { describe, expect, it } from 'vitest';
import type { Imagen } from '../../src/lib/dominio/tipos.ts';
import { leerImagen, urlsAEliminar } from '../../src/lib/validacion/imagenFormulario.ts';

const reconoce = (url: string): boolean => url.startsWith('/uploads/');
const verifica = (subida: { firma: string }): boolean => subida.firma === 'firma-buena';

const ACTUAL: Imagen = { sm: '/uploads/a-sm.webp', lg: '/uploads/a-lg.webp', ancho: 1200, alto: 800, altEs: 'Churrasco con palta' };
const NUEVA = JSON.stringify({ sm: '/uploads/n-sm.webp', lg: '/uploads/n-lg.webp', ancho: 1200, alto: 900, firma: 'firma-buena' });

function formulario(campos: Record<string, string>): FormData {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
	return datos;
}

const leer = (campos: Record<string, string>, actual: Imagen | null = null) =>
	leerImagen(formulario(campos), { actual, reconoce, verifica, altPorDefecto: 'Churrasco' });

describe('leerImagen', () => {
	it('sin foto antes ni ahora, queda sin foto', () => {
		expect(leer({})).toEqual({ ok: true, datos: { imagen: null } });
	});

	it('sin cambios conserva la foto actual', () => {
		expect(leer({}, ACTUAL)).toEqual({ ok: true, datos: { imagen: ACTUAL } });
	});

	it('permite cambiar solo el texto alternativo de la foto actual', () => {
		const resultado = leer({ imagenAltEs: ' Churrasco italiano ', imagenAltEn: 'Italian churrasco' }, ACTUAL);

		expect(resultado).toEqual({ ok: true, datos: { imagen: { ...ACTUAL, altEs: 'Churrasco italiano', altEn: 'Italian churrasco' } } });
	});

	it('reemplaza la foto por una recién subida, con el nombre del producto como texto alternativo si no hay otro', () => {
		const resultado = leer({ imagen: NUEVA }, ACTUAL);

		expect(resultado).toEqual({
			ok: true,
			datos: { imagen: { sm: '/uploads/n-sm.webp', lg: '/uploads/n-lg.webp', ancho: 1200, alto: 900, altEs: 'Churrasco' } },
		});
	});

	it('usa el texto alternativo escrito (y omite el inglés si está vacío)', () => {
		const resultado = leer({ imagen: NUEVA, imagenAltEs: 'Plato con papas fritas', imagenAltEn: '  ' });

		expect(resultado).toMatchObject({ ok: true, datos: { imagen: { altEs: 'Plato con papas fritas' } } });
		if (resultado.ok) expect(resultado.datos.imagen).not.toHaveProperty('altEn');
	});

	it('«quitar foto» elimina la actual, y gana sobre una nueva', () => {
		expect(leer({ quitarImagen: 'on' }, ACTUAL)).toEqual({ ok: true, datos: { imagen: null } });
		expect(leer({ quitarImagen: 'on', imagen: NUEVA }, ACTUAL)).toEqual({ ok: true, datos: { imagen: null } });
	});

	it.each([
		['JSON roto', '{no es json'],
		['no es un objeto', '"texto"'],
		['sin campos', '{}'],
		['url de otro sitio', JSON.stringify({ sm: 'https://evil.com/a.webp', lg: '/uploads/n-lg.webp', ancho: 10, alto: 10, firma: 'firma-buena' })],
		['url javascript', JSON.stringify({ sm: 'javascript:alert(1)', lg: '/uploads/n-lg.webp', ancho: 10, alto: 10, firma: 'firma-buena' })],
		['dimensiones cero', JSON.stringify({ sm: '/uploads/a.webp', lg: '/uploads/b.webp', ancho: 0, alto: 10, firma: 'firma-buena' })],
		['dimensiones enormes', JSON.stringify({ sm: '/uploads/a.webp', lg: '/uploads/b.webp', ancho: 99999, alto: 10, firma: 'firma-buena' })],
		['dimensiones no enteras', JSON.stringify({ sm: '/uploads/a.webp', lg: '/uploads/b.webp', ancho: 10.5, alto: 10, firma: 'firma-buena' })],
		['sin firma', JSON.stringify({ sm: '/uploads/n-sm.webp', lg: '/uploads/n-lg.webp', ancho: 1200, alto: 900 })],
		['firma falsa', JSON.stringify({ sm: '/uploads/n-sm.webp', lg: '/uploads/n-lg.webp', ancho: 1200, alto: 900, firma: 'inventada' })],
		['demasiado largo', JSON.stringify({ sm: `/uploads/${'a'.repeat(3000)}`, lg: '/uploads/b.webp', ancho: 10, alto: 10, firma: 'firma-buena' })],
	])('rechaza una foto nueva inválida: %s', (_nombre, imagen) => {
		expect(leer({ imagen }, ACTUAL)).toEqual({ ok: false, errores: { imagen: 'La foto no se subió bien. Vuelve a elegirla.' } });
	});

	it('rechaza un texto alternativo demasiado largo', () => {
		const resultado = leer({ imagen: NUEVA, imagenAltEs: 'x'.repeat(151) });

		expect(resultado).toMatchObject({ ok: false, errores: { imagenAltEs: expect.stringMatching(/150/) } });
	});

	it('exige texto alternativo si no hay uno ni nombre por defecto', () => {
		const resultado = leerImagen(formulario({ imagen: NUEVA }), { actual: null, reconoce, verifica, altPorDefecto: '' });

		expect(resultado).toMatchObject({ ok: false, errores: { imagenAltEs: expect.stringMatching(/Describe/) } });
	});
});

describe('urlsAEliminar', () => {
	const OTRA: Imagen = { ...ACTUAL, sm: '/uploads/b-sm.webp', lg: '/uploads/b-lg.webp' };

	it('no elimina nada si la foto no cambió (solo cambió el texto alternativo)', () => {
		expect(urlsAEliminar(ACTUAL, { ...ACTUAL, altEs: 'otro' })).toEqual([]);
	});

	it('elimina las dos versiones al quitar o reemplazar la foto', () => {
		expect(urlsAEliminar(ACTUAL, null)).toEqual([ACTUAL.sm, ACTUAL.lg]);
		expect(urlsAEliminar(ACTUAL, OTRA)).toEqual([ACTUAL.sm, ACTUAL.lg]);
	});

	it('si solo una de las dos versiones sigue en uso, esa no se elimina', () => {
		expect(urlsAEliminar(ACTUAL, { ...OTRA, sm: ACTUAL.sm })).toEqual([ACTUAL.lg]);
		expect(urlsAEliminar(ACTUAL, { ...OTRA, lg: ACTUAL.lg })).toEqual([ACTUAL.sm]);
	});

	it('no hay nada que eliminar si antes no había foto', () => {
		expect(urlsAEliminar(null, OTRA)).toEqual([]);
		expect(urlsAEliminar(null, null)).toEqual([]);
	});
});
