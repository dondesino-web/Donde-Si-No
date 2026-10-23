import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, inject, it } from 'vitest';
import { abrirBd, crearClienteBd, validarConfigBd } from '../../src/lib/db/cliente.ts';

describe('crearClienteBd', () => {
	it('falla con un mensaje claro si falta la URL de la base de datos', () => {
		expect(() => crearClienteBd({ url: '' })).toThrow('TURSO_DATABASE_URL');
	});
});

describe('abrirBd', () => {
	const archivoNuevo = (): string => pathToFileURL(join(inject('directorioTemporal'), `${randomUUID()}.db`)).href;

	it('con un archivo local, espera su turno si otra conexión lo tiene bloqueado en vez de fallar con SQLITE_BUSY', async () => {
		const { cliente } = await abrirBd({ url: archivoNuevo() });
		try {
			const resultado = await cliente.execute('pragma busy_timeout');

			expect(Number(resultado.rows[0][0])).toBeGreaterThanOrEqual(5000);
		} finally {
			cliente.close();
		}
	});

	it('la espera ya está configurada en la primera consulta, aunque se lance sin esperar a nada más', async () => {
		const { cliente } = await abrirBd({ url: archivoNuevo() });
		try {
			const lectura = await cliente.execute('pragma busy_timeout');

			expect(Number(lectura.rows[0][0])).toBeGreaterThanOrEqual(5000);
		} finally {
			cliente.close();
		}
	});

	it('con una base remota no toca nada (no hay archivo que bloquear)', async () => {
		const { cliente } = await abrirBd({ url: 'libsql://dondesino.turso.io', authToken: 'token' });
		cliente.close();
	});

	it('falla con un mensaje claro si falta la URL', async () => {
		await expect(abrirBd({ url: '' })).rejects.toThrow('TURSO_DATABASE_URL');
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
