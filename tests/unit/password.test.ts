import { describe, expect, it } from 'vitest';
import { hashearPassword, verificarPassword } from '../../src/lib/auth/password.ts';

describe('hashearPassword / verificarPassword', () => {
	it('acepta la contraseña correcta', async () => {
		const hash = await hashearPassword('una-clave-larga-y-segura');

		expect(await verificarPassword('una-clave-larga-y-segura', hash)).toBe(true);
	});

	it('rechaza una contraseña incorrecta', async () => {
		const hash = await hashearPassword('una-clave-larga-y-segura');

		expect(await verificarPassword('otra-clave', hash)).toBe(false);
		expect(await verificarPassword('', hash)).toBe(false);
	});

	it('genera un hash distinto cada vez (sal aleatoria) y nunca guarda la clave en claro', async () => {
		const [a, b] = await Promise.all([hashearPassword('misma-clave-12345'), hashearPassword('misma-clave-12345')]);

		expect(a).not.toBe(b);
		expect(a).not.toContain('misma-clave-12345');
		expect(a.startsWith('scrypt$')).toBe(true);
	});

	it.each(['', 'texto-cualquiera', 'scrypt$1$2', 'bcrypt$a$b$c$d$e', 'scrypt$x$8$1$AAAA$AAAA'])(
		'devuelve false (sin lanzar) ante un hash mal formado: %j',
		async (almacenado) => {
			expect(await verificarPassword('clave', almacenado)).toBe(false);
		},
	);

	it('rechaza sin derivar una contraseña absurdamente larga', async () => {
		const hash = await hashearPassword('una-clave-larga-y-segura');

		expect(await verificarPassword('x'.repeat(257), hash)).toBe(false);
	});

	it('rechaza contraseñas demasiado cortas al crear el hash', async () => {
		await expect(hashearPassword('corta')).rejects.toThrow(/al menos 12/);
	});
});
