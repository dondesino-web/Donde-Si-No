import { describe, expect, it } from 'vitest';
import { UI } from '../../src/i18n/ui.ts';
import { otroIdioma, rutaPagina, textoLocal, traductor } from '../../src/i18n/utils.ts';

describe('traductor', () => {
	it('devuelve el texto de la interfaz en el idioma pedido', () => {
		expect(traductor('es')('accion.llamar')).toBe('Llamar');
		expect(traductor('en')('accion.llamar')).toBe('Call');
	});

	it('reemplaza variables entre llaves', () => {
		expect(traductor('es')('estado.cierra', { hora: '01:00' })).toBe('cierra a las 01:00');
	});

	it('tiene las mismas claves en español e inglés', () => {
		expect(Object.keys(UI.en).sort()).toEqual(Object.keys(UI.es).sort());
	});
});

describe('textoLocal', () => {
	it('usa el texto en inglés cuando existe', () => {
		expect(textoLocal('en', 'Papas fritas', 'French fries')).toEqual({ texto: 'French fries', idioma: 'en' });
	});

	it('cae al español si falta la traducción, y lo indica para los lectores de pantalla', () => {
		expect(textoLocal('en', 'Chorrillana', null)).toEqual({ texto: 'Chorrillana', idioma: 'es' });
		expect(textoLocal('en', 'Chorrillana', '   ')).toEqual({ texto: 'Chorrillana', idioma: 'es' });
	});

	it('en español siempre usa el texto en español', () => {
		expect(textoLocal('es', 'Papas fritas', 'French fries')).toEqual({ texto: 'Papas fritas', idioma: 'es' });
	});
});

describe('rutas', () => {
	it('construye la ruta de cada página según el idioma', () => {
		expect(rutaPagina('es', 'carta')).toBe('/');
		expect(rutaPagina('en', 'carta')).toBe('/en/');
		expect(rutaPagina('es', 'imprimir')).toBe('/imprimir');
		expect(rutaPagina('en', 'imprimir')).toBe('/en/print');
	});

	it('alterna entre los dos idiomas', () => {
		expect(otroIdioma('es')).toBe('en');
		expect(otroIdioma('en')).toBe('es');
	});
});
