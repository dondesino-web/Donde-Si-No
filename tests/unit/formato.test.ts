import { describe, expect, it } from 'vitest';
import { formatearPrecio, formatearTelefono } from '../../src/lib/dominio/formato.ts';

describe('formatearPrecio', () => {
	it('usa el formato chileno en español', () => {
		expect(formatearPrecio(4500, 'es')).toBe('$4.500');
		expect(formatearPrecio(12990, 'es')).toBe('$12.990');
	});

	it('indica la moneda en inglés para que un turista no la confunda con dólares', () => {
		expect(formatearPrecio(4500, 'en')).toBe('CLP 4,500');
	});

	it('devuelve null si el producto no tiene precio («Consultar»)', () => {
		expect(formatearPrecio(null, 'es')).toBeNull();
	});

	it('muestra un precio cero como gratis en número, no como consultar', () => {
		expect(formatearPrecio(0, 'es')).toBe('$0');
	});
});

describe('formatearTelefono', () => {
	it('agrupa un celular chileno para leerlo fácil', () => {
		expect(formatearTelefono('+56988860939')).toBe('+56 9 8886 0939');
	});

	it('deja igual cualquier otro formato', () => {
		expect(formatearTelefono('+56221234567')).toBe('+56221234567');
	});
});
