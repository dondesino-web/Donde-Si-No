import { describe, expect, it } from 'vitest';
import { TEMAS, TEMA_POR_DEFECTO, buscarTema, esTema, temaOPorDefecto } from '../../src/lib/dominio/temas.ts';

describe('TEMAS', () => {
	it('ofrece al menos el diseño actual y tres alternativas, con identificador único', () => {
		const ids = TEMAS.map((t) => t.id);

		expect(ids).toEqual(['clasico', 'bistro', 'noche', 'fotos']);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('cada tema tiene nombre y descripción en español y un color de barra del navegador', () => {
		for (const tema of TEMAS) {
			expect(tema.nombre.length, tema.id).toBeGreaterThan(2);
			expect(tema.descripcion.length, tema.id).toBeGreaterThan(20);
			expect(tema.colorBarra, tema.id).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it('el tema por defecto es el clásico, el diseño que ya existía', () => {
		expect(TEMA_POR_DEFECTO).toBe('clasico');
		expect(TEMAS[0]?.id).toBe(TEMA_POR_DEFECTO);
	});
});

describe('esTema', () => {
	it('acepta los identificadores conocidos', () => {
		for (const { id } of TEMAS) expect(esTema(id)).toBe(true);
	});

	it('rechaza cualquier otra cosa, incluidos nombres de propiedades heredadas', () => {
		for (const valor of ['', 'Clasico', 'otro', 'constructor', '__proto__', 'toString', null, undefined, 3, {}]) expect(esTema(valor)).toBe(false);
	});
});

describe('temaOPorDefecto', () => {
	it('devuelve el tema si es válido y el clásico si no, para que un valor raro nunca rompa la carta', () => {
		expect(temaOPorDefecto('noche')).toBe('noche');
		expect(temaOPorDefecto('desconocido')).toBe('clasico');
		expect(temaOPorDefecto(null)).toBe('clasico');
	});
});

describe('buscarTema', () => {
	it('devuelve los datos del tema, y los del clásico si el identificador no existe', () => {
		expect(buscarTema('bistro').nombre).toBe('Bistró');
		expect(buscarTema('x').id).toBe('clasico');
	});
});
