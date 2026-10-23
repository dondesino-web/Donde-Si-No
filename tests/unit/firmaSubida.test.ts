import { describe, expect, it } from 'vitest';
import { firmarSubida, verificarSubida } from '../../src/lib/almacenamiento/firma.ts';

const SECRETO = 'a'.repeat(32);
const SUBIDA = { sm: '/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp', lg: '/uploads/1a8fad5b-d9cb-469f-a165-70867728950e.webp', ancho: 1200, alto: 800 };

describe('firma de las subidas', () => {
	it('una subida firmada por el servidor verifica', () => {
		const firma = firmarSubida(SECRETO, SUBIDA);

		expect(verificarSubida(SECRETO, { ...SUBIDA, firma })).toBe(true);
	});

	it('es determinista y depende del secreto', () => {
		expect(firmarSubida(SECRETO, SUBIDA)).toBe(firmarSubida(SECRETO, SUBIDA));
		expect(firmarSubida('b'.repeat(32), SUBIDA)).not.toBe(firmarSubida(SECRETO, SUBIDA));
		expect(verificarSubida('b'.repeat(32), { ...SUBIDA, firma: firmarSubida(SECRETO, SUBIDA) })).toBe(false);
	});

	it.each([
		['otra URL chica', { sm: '/uploads/2b8fad5b-d9cb-469f-a165-70867728950e.webp' }],
		['otra URL grande', { lg: '/uploads/2b8fad5b-d9cb-469f-a165-70867728950e.webp' }],
		['otro ancho', { ancho: 1199 }],
		['otro alto', { alto: 801 }],
	])('rechaza una subida modificada (%s)', (_nombre, cambio) => {
		const firma = firmarSubida(SECRETO, SUBIDA);

		expect(verificarSubida(SECRETO, { ...SUBIDA, ...cambio, firma })).toBe(false);
	});

	it('no se puede mover una URL de un campo al otro sin invalidar la firma', () => {
		const firma = firmarSubida(SECRETO, SUBIDA);

		expect(verificarSubida(SECRETO, { ...SUBIDA, sm: SUBIDA.lg, lg: SUBIDA.sm, firma })).toBe(false);
	});

	it.each(['', 'x', 'AAAA', 'a'.repeat(500)])('rechaza una firma mal formada: %j', (firma) => {
		expect(verificarSubida(SECRETO, { ...SUBIDA, firma })).toBe(false);
	});

	it('exige un secreto de al menos 32 caracteres', () => {
		expect(() => firmarSubida('corto', SUBIDA)).toThrow(/32/);
		expect(verificarSubida('corto', { ...SUBIDA, firma: 'x' })).toBe(false);
	});
});
