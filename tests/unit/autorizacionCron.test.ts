import { describe, expect, it } from 'vitest';
import { autorizadoPorCron } from '../../src/lib/auth/cron.ts';

const SECRETO = 'c'.repeat(32);

describe('autorizadoPorCron', () => {
	it('acepta la cabecera que envía Vercel: Authorization: Bearer <CRON_SECRET>', () => {
		expect(autorizadoPorCron(`Bearer ${SECRETO}`, SECRETO)).toBe(true);
	});

	it.each([
		['sin cabecera', null],
		['vacía', ''],
		['sin el prefijo Bearer', SECRETO],
		['con otro esquema', `Basic ${SECRETO}`],
		['con otro secreto', `Bearer ${'d'.repeat(32)}`],
		['con un secreto más corto', `Bearer ${SECRETO.slice(0, 31)}`],
		['con un secreto más largo', `Bearer ${SECRETO}x`],
		['con espacios de más', `Bearer  ${SECRETO}`],
		['en minúsculas', `bearer ${SECRETO}`],
	])('rechaza una cabecera %s', (_nombre, cabecera) => {
		expect(autorizadoPorCron(cabecera, SECRETO)).toBe(false);
	});

	it('rechaza todo si el secreto no está configurado o es demasiado corto (nunca queda abierto)', () => {
		expect(autorizadoPorCron('Bearer ', '')).toBe(false);
		expect(autorizadoPorCron('Bearer ', undefined)).toBe(false);
		expect(autorizadoPorCron('Bearer corto', 'corto')).toBe(false);
	});
});
