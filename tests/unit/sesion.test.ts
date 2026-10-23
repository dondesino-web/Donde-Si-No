import { describe, expect, it } from 'vitest';
import { DURACION_SESION_MS, crearTokenSesion, verificarTokenSesion } from '../../src/lib/auth/sesion.ts';

const SECRETO = 'a'.repeat(32);
const AHORA = new Date('2026-10-23T12:00:00Z');

describe('token de sesión', () => {
	it('es válido recién creado', () => {
		const token = crearTokenSesion(SECRETO, AHORA);

		expect(verificarTokenSesion(SECRETO, token, AHORA)).toBe(true);
	});

	it('vence a los 7 días', () => {
		const token = crearTokenSesion(SECRETO, AHORA);
		const casi = new Date(AHORA.getTime() + DURACION_SESION_MS - 1);
		const vencido = new Date(AHORA.getTime() + DURACION_SESION_MS);

		expect(DURACION_SESION_MS).toBe(7 * 24 * 60 * 60 * 1000);
		expect(verificarTokenSesion(SECRETO, token, casi)).toBe(true);
		expect(verificarTokenSesion(SECRETO, token, vencido)).toBe(false);
	});

	it('se invalida al cambiar el secreto', () => {
		const token = crearTokenSesion(SECRETO, AHORA);

		expect(verificarTokenSesion('b'.repeat(32), token, AHORA)).toBe(false);
	});

	it('rechaza un token manipulado (fecha alargada o firma alterada)', () => {
		const token = crearTokenSesion(SECRETO, AHORA);
		const [exp, firma] = token.split('.');
		const alargado = `${Number(exp) + 10 ** 9}.${firma}`;
		const firmaAlterada = `${exp}.${firma.slice(0, -2)}AA`;

		expect(verificarTokenSesion(SECRETO, alargado, AHORA)).toBe(false);
		expect(verificarTokenSesion(SECRETO, firmaAlterada, AHORA)).toBe(false);
	});

	it.each([undefined, '', 'basura', '123', '.', 'abc.def', '99999999999999.'])('rechaza tokens mal formados: %j', (token) => {
		expect(verificarTokenSesion(SECRETO, token, AHORA)).toBe(false);
	});

	it('exige un secreto de al menos 32 caracteres', () => {
		expect(() => crearTokenSesion('corto', AHORA)).toThrow(/32/);
		expect(verificarTokenSesion('corto', 'x.y', AHORA)).toBe(false);
	});
});
