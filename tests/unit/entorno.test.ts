import { describe, expect, it } from 'vitest';
import { hashearPassword } from '../../src/lib/auth/password.ts';
import { validarEntorno } from '../../src/lib/entorno.ts';

const largo = (n: number, letra = 'a') => letra.repeat(n);

async function entornoCorrecto(): Promise<Record<string, string>> {
	return {
		TURSO_DATABASE_URL: 'libsql://dondesino-jonat.aws-us-east-1.turso.io',
		TURSO_AUTH_TOKEN: `eyJhbGciOiJFZERTQSJ9.${largo(40)}.${largo(40)}`,
		BLOB_READ_WRITE_TOKEN: `vercel_blob_rw_AbC123xyz_${largo(30)}`,
		ADMIN_PASSWORD_HASH: await hashearPassword('una-clave-larga-y-segura'),
		SESSION_SECRET: largo(43, 's'),
		ISR_BYPASS_TOKEN: largo(43, 'i'),
		CRON_SECRET: largo(32, 'c'),
	};
}

const variablesConProblema = (resultado: ReturnType<typeof validarEntorno>): string[] => resultado.problemas.map((p) => p.variable).sort();

describe('validarEntorno (producción)', () => {
	it('acepta un entorno completo y bien formado', async () => {
		const resultado = validarEntorno(await entornoCorrecto());

		expect(resultado).toEqual({ ok: true, problemas: [], avisos: [] });
	});

	it('informa todas las variables que faltan, sin detenerse en la primera', () => {
		const resultado = validarEntorno({});

		expect(resultado.ok).toBe(false);
		expect(variablesConProblema(resultado)).toEqual([
			'ADMIN_PASSWORD_HASH',
			'BLOB_READ_WRITE_TOKEN',
			'CRON_SECRET',
			'ISR_BYPASS_TOKEN',
			'SESSION_SECRET',
			'TURSO_AUTH_TOKEN',
			'TURSO_DATABASE_URL',
		]);
		expect(resultado.problemas.every((p) => /falta/i.test(p.mensaje))).toBe(true);
	});

	it('rechaza una base local: en Vercel el disco es efímero', async () => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), TURSO_DATABASE_URL: 'file:local.db' });

		expect(variablesConProblema(resultado)).toEqual(['TURSO_DATABASE_URL']);
		expect(resultado.problemas[0].mensaje).toMatch(/Turso/);
	});

	it('exige que el token de Blob tenga el formato de Vercel', async () => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), BLOB_READ_WRITE_TOKEN: 'cualquier-cosa' });

		expect(variablesConProblema(resultado)).toEqual(['BLOB_READ_WRITE_TOKEN']);
	});

	it.each(['no-es-un-hash', 'scrypt$1$2', 'bcrypt$a$b$c$d$e'])('rechaza un hash de contraseña mal formado: %s', async (hash) => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), ADMIN_PASSWORD_HASH: hash });

		expect(variablesConProblema(resultado)).toEqual(['ADMIN_PASSWORD_HASH']);
	});

	it('advierte si pegaron la contraseña en vez de su hash', async () => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), ADMIN_PASSWORD_HASH: 'mi-contraseña-en-claro' });

		expect(resultado.problemas[0].mensaje).toMatch(/npm run admin:hash/);
	});

	it.each([
		['SESSION_SECRET', 31],
		['ISR_BYPASS_TOKEN', 31],
		['CRON_SECRET', 15],
	])('exige un largo mínimo en %s (%d caracteres no alcanzan)', async (variable, cortos) => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), [variable]: largo(cortos, 'z') });

		expect(variablesConProblema(resultado)).toEqual([variable]);
	});

	it('exige secretos distintos entre sí: compartirlos amplía el daño si uno se filtra', async () => {
		const base = await entornoCorrecto();
		const resultado = validarEntorno({ ...base, ISR_BYPASS_TOKEN: base.SESSION_SECRET });

		expect(variablesConProblema(resultado)).toEqual(['ISR_BYPASS_TOKEN', 'SESSION_SECRET']);
		expect(resultado.problemas.every((p) => /distint/i.test(p.mensaje))).toBe(true);
	});

	it('detecta espacios o comillas pegados por error al copiar el valor', async () => {
		const base = await entornoCorrecto();
		const resultado = validarEntorno({ ...base, SESSION_SECRET: ` ${base.SESSION_SECRET}\n`, CRON_SECRET: `"${base.CRON_SECRET}"` });

		expect(variablesConProblema(resultado)).toEqual(['CRON_SECRET', 'SESSION_SECRET']);
		expect(resultado.problemas.every((p) => /espacios|comillas/i.test(p.mensaje))).toBe(true);
	});

	it('avisa (sin bloquear) si el token de Turso no parece un JWT', async () => {
		const resultado = validarEntorno({ ...(await entornoCorrecto()), TURSO_AUTH_TOKEN: 'token-raro' });

		expect(resultado.ok).toBe(true);
		expect(resultado.avisos.map((a) => a.variable)).toEqual(['TURSO_AUTH_TOKEN']);
	});

	it('nunca repite el valor de un secreto en sus mensajes', async () => {
		const base = await entornoCorrecto();
		const secreto = 'ESTE-SECRETO-NO-DEBE-APARECER-NUNCA';
		const resultado = validarEntorno({ ...base, SESSION_SECRET: secreto, CRON_SECRET: secreto, BLOB_READ_WRITE_TOKEN: secreto });

		const texto = JSON.stringify(resultado);
		expect(texto).not.toContain(secreto);
		expect(resultado.problemas.length).toBeGreaterThan(0);
	});
});
