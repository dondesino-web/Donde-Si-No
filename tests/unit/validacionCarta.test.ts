import { describe, expect, it } from 'vitest';
import { slugificar } from '../../src/lib/dominio/slug.ts';
import { parsearPrecio, validarCategoria, validarProducto } from '../../src/lib/validacion/carta.ts';

function formulario(campos: Record<string, string | string[]>): FormData {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) {
		for (const v of Array.isArray(valor) ? valor : [valor]) datos.append(clave, v);
	}
	return datos;
}

const BASE = { categoriaId: '3', nombreEs: 'Churrasco', precio: '4500' };

describe('parsearPrecio', () => {
	it.each([
		['4500', 4500],
		['4.500', 4500],
		['$ 4.500', 4500],
		['  12000 ', 12000],
		['0', 0],
	])('interpreta %j como %d pesos', (texto, esperado) => {
		expect(parsearPrecio(texto)).toBe(esperado);
	});

	it.each(['', '   '])('trata %j como «Consultar» (sin precio)', (texto) => {
		expect(parsearPrecio(texto)).toBeNull();
	});

	it.each(['-500', '4,5', 'abc', '4500 pesos', '1e3', '10000001'])('rechaza %j', (texto) => {
		expect(parsearPrecio(texto)).toBeUndefined();
	});
});

describe('validarProducto', () => {
	it('acepta un producto mínimo y rellena los valores por defecto', () => {
		const resultado = validarProducto(formulario(BASE));

		expect(resultado).toEqual({
			ok: true,
			datos: {
				categoriaId: 3,
				nombreEs: 'Churrasco',
				nombreEn: null,
				descripcionEs: '',
				descripcionEn: null,
				precio: 4500,
				alergenos: [],
				etiquetas: [],
				disponible: false,
				destacado: false,
				visible: false,
			},
		});
	});

	it('lee casillas, listas y limpia espacios', () => {
		const resultado = validarProducto(
			formulario({
				...BASE,
				nombreEs: '  Completo italiano ',
				nombreEn: ' Italian hot dog',
				descripcionEs: ' Palta, tomate y mayo ',
				precio: '',
				alergenos: ['gluten', 'huevo'],
				etiquetas: ['picante'],
				disponible: 'on',
				destacado: 'on',
				visible: 'on',
			}),
		);

		expect(resultado).toMatchObject({
			ok: true,
			datos: {
				nombreEs: 'Completo italiano',
				nombreEn: 'Italian hot dog',
				descripcionEs: 'Palta, tomate y mayo',
				precio: null,
				alergenos: ['gluten', 'huevo'],
				etiquetas: ['picante'],
				disponible: true,
				destacado: true,
				visible: true,
			},
		});
	});

	it('informa los errores por campo, en español', () => {
		const resultado = validarProducto(
			formulario({ categoriaId: 'x', nombreEs: '   ', precio: '-5', alergenos: ['polvo-magico'] }),
		);

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['alergenos', 'categoriaId', 'nombreEs', 'precio']);
		expect(resultado.errores.nombreEs).toBe('Escribe el nombre del producto.');
		expect(resultado.errores.precio).toMatch(/solo números/i);
	});

	it('elimina alérgenos repetidos y rechaza listas desmedidas', () => {
		const repetidos = validarProducto(formulario({ ...BASE, alergenos: ['gluten', 'huevo', 'gluten'] }));
		const desmedida = validarProducto(formulario({ ...BASE, alergenos: Array(50).fill('gluten') }));

		expect(repetidos).toMatchObject({ ok: true, datos: { alergenos: ['gluten', 'huevo'] } });
		expect(desmedida).toMatchObject({ ok: false, errores: { alergenos: expect.any(String) } });
	});

	it.each(['1e2', '0x10', ' 5 ', '-3', '2.5', '99999999999'])('rechaza categoriaId %j', (valor) => {
		const resultado = validarProducto(formulario({ ...BASE, categoriaId: valor }));

		expect(resultado).toMatchObject({ ok: false, errores: { categoriaId: 'Elige una categoría.' } });
	});

	it('rechaza textos demasiado largos', () => {
		const resultado = validarProducto(formulario({ ...BASE, nombreEs: 'x'.repeat(81), descripcionEs: 'y'.repeat(301) }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['descripcionEs', 'nombreEs']);
	});
});

describe('validarCategoria', () => {
	it('acepta nombre en español y deja el inglés opcional', () => {
		expect(validarCategoria(formulario({ nombreEs: ' Bebidas ' }))).toEqual({
			ok: true,
			datos: { nombreEs: 'Bebidas', nombreEn: null, visible: false },
		});
	});

	it('exige el nombre', () => {
		const resultado = validarCategoria(formulario({ nombreEs: '' }));

		expect(resultado).toMatchObject({ ok: false, errores: { nombreEs: 'Escribe el nombre de la categoría.' } });
	});
});

describe('slugificar', () => {
	it.each([
		['Completos y as', 'completos-y-as'],
		['Té, café & jugos', 'te-cafe-jugos'],
		['  Ñoquis!!  ', 'noquis'],
		['Hamburguesas 2x1', 'hamburguesas-2x1'],
	])('convierte %j en %j', (nombre, slug) => {
		expect(slugificar(nombre)).toBe(slug);
	});

	it('nunca devuelve una cadena vacía', () => {
		expect(slugificar('???')).toBe('categoria');
	});
});
