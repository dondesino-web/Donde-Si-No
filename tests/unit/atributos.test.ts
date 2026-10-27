import { describe, expect, it } from 'vitest';
import { nombresDeAtributos } from '../../src/lib/dominio/atributos.ts';

const CATALOGO = [
	{ tipo: 'alergeno', clave: 'gluten', nombreEs: 'gluten', nombreEn: 'gluten' },
	{ tipo: 'alergeno', clave: 'mani', nombreEs: 'maní', nombreEn: 'peanuts' },
	{ tipo: 'alergeno', clave: 'apio', nombreEs: 'apio', nombreEn: null },
	{ tipo: 'etiqueta', clave: 'gluten', nombreEs: 'Sin gluten', nombreEn: null },
] as const;

describe('nombresDeAtributos', () => {
	it('traduce las claves al nombre del idioma, en el orden del producto', () => {
		expect(nombresDeAtributos(CATALOGO, 'alergeno', ['mani', 'gluten'], 'es')).toEqual(['maní', 'gluten']);
		expect(nombresDeAtributos(CATALOGO, 'alergeno', ['mani', 'gluten'], 'en')).toEqual(['peanuts', 'gluten']);
	});

	it('usa el español si falta la traducción', () => {
		expect(nombresDeAtributos(CATALOGO, 'alergeno', ['apio'], 'en')).toEqual(['apio']);
	});

	it('no mezcla alérgenos con etiquetas que tienen la misma clave', () => {
		expect(nombresDeAtributos(CATALOGO, 'etiqueta', ['gluten'], 'es')).toEqual(['Sin gluten']);
	});

	it('omite las claves que ya no existen en el catálogo', () => {
		expect(nombresDeAtributos(CATALOGO, 'alergeno', ['borrado', 'mani'], 'es')).toEqual(['maní']);
	});
});
