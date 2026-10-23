import { describe, expect, it } from 'vitest';
import { crearClienteBd, validarConfigBd } from '../../src/lib/db/cliente.ts';

describe('crearClienteBd', () => {
	it('falla con un mensaje claro si falta la URL de la base de datos', () => {
		expect(() => crearClienteBd({ url: '' })).toThrow('TURSO_DATABASE_URL');
	});
});

describe('validarConfigBd', () => {
	it('acepta un archivo SQLite local en desarrollo', () => {
		const config = { url: 'file:local.db' };

		expect(validarConfigBd(config, false)).toEqual(config);
	});

	it('acepta Turso con token en producción', () => {
		const config = { url: 'libsql://dondesino.turso.io', authToken: 'token' };

		expect(validarConfigBd(config, true)).toEqual(config);
	});

	it('rechaza un archivo local en producción, donde el disco es efímero y de solo lectura', () => {
		expect(() => validarConfigBd({ url: 'file:local.db', authToken: 'token' }, true)).toThrow(
			'TURSO_DATABASE_URL',
		);
	});

	it('rechaza Turso sin token en producción', () => {
		expect(() => validarConfigBd({ url: 'libsql://dondesino.turso.io' }, true)).toThrow('TURSO_AUTH_TOKEN');
	});
});
