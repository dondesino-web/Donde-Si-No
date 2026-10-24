import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	MAX_INTENTOS,
	VENTANA_INTENTOS_MS,
	hashearIp,
	limpiarIntentos,
	purgarIntentosVencidos,
	reservarIntento,
} from '../../src/lib/auth/limiteIntentos.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const AHORA = new Date('2026-10-23T12:00:00Z');
const despues = (ms: number) => new Date(AHORA.getTime() + ms);

describe('límite de intentos de login', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	it('permite hasta el máximo de intentos y bloquea el siguiente', async () => {
		for (let i = 0; i < MAX_INTENTOS; i++) {
			expect(await reservarIntento(prueba.bd, 'ip-1', AHORA)).toBe(true);
		}

		expect(await reservarIntento(prueba.bd, 'ip-1', AHORA)).toBe(false);
		expect(await reservarIntento(prueba.bd, 'ip-1', AHORA)).toBe(false);
	});

	it('no se puede evadir con peticiones simultáneas', async () => {
		const resultados = await Promise.all(Array.from({ length: 20 }, () => reservarIntento(prueba.bd, 'ip-1', AHORA)));

		expect(resultados.filter(Boolean)).toHaveLength(MAX_INTENTOS);
	});

	it('el bloqueo de una IP no afecta a otra', async () => {
		for (let i = 0; i < MAX_INTENTOS + 1; i++) await reservarIntento(prueba.bd, 'ip-1', AHORA);

		expect(await reservarIntento(prueba.bd, 'ip-2', AHORA)).toBe(true);
	});

	it('los intentos bloqueados no alargan la ventana', async () => {
		for (let i = 0; i < MAX_INTENTOS + 1; i++) await reservarIntento(prueba.bd, 'ip-1', AHORA);

		expect(await reservarIntento(prueba.bd, 'ip-1', despues(VENTANA_INTENTOS_MS - 1))).toBe(false);
		expect(await reservarIntento(prueba.bd, 'ip-1', despues(VENTANA_INTENTOS_MS))).toBe(true);
	});

	it('un login correcto limpia el contador', async () => {
		for (let i = 0; i < MAX_INTENTOS; i++) await reservarIntento(prueba.bd, 'ip-1', AHORA);

		await limpiarIntentos(prueba.bd, 'ip-1');

		expect(await reservarIntento(prueba.bd, 'ip-1', AHORA)).toBe(true);
	});
});

describe('hashearIp', () => {
	const SECRETO = 's'.repeat(32);

	it('es estable, no revela la IP y depende del secreto', () => {
		const hash = hashearIp('203.0.113.7', SECRETO);

		expect(hashearIp('203.0.113.7', SECRETO)).toBe(hash);
		expect(hash).not.toContain('203.0.113.7');
		expect(hashearIp('203.0.113.8', SECRETO)).not.toBe(hash);
		expect(hashearIp('203.0.113.7', 't'.repeat(32))).not.toBe(hash);
	});
});

describe('hashearIp con IPv6', () => {
	const SECRETO = 's'.repeat(32);

	it('agrupa las direcciones de una misma red /64: quien rota dentro de ella no obtiene intentos nuevos', () => {
		const a = hashearIp('2001:db8:abcd:12:1111:2222:3333:4444', SECRETO);
		const b = hashearIp('2001:db8:abcd:12:ffff:eeee:dddd:cccc', SECRETO);

		expect(a).toBe(b);
	});

	it('distingue redes /64 distintas', () => {
		expect(hashearIp('2001:db8:abcd:12::1', SECRETO)).not.toBe(hashearIp('2001:db8:abcd:13::1', SECRETO));
	});

	it('entiende la forma abreviada con ::', () => {
		expect(hashearIp('2001:db8::1', SECRETO)).toBe(hashearIp('2001:0db8:0:0:9:9:9:9', SECRETO));
		expect(hashearIp('::1', SECRETO)).toBe(hashearIp('0:0:0:0:5:6:7:8', SECRETO));
	});

	it('trata una IPv4 escrita como IPv6 (::ffff:a.b.c.d) como esa misma IPv4', () => {
		expect(hashearIp('::ffff:203.0.113.7', SECRETO)).toBe(hashearIp('203.0.113.7', SECRETO));
	});

	it('no mezcla IPv4 con IPv6 ni se confunde con el texto de otra dirección', () => {
		expect(hashearIp('203.0.113.7', SECRETO)).not.toBe(hashearIp('203.0.113.8', SECRETO));
		expect(hashearIp('2001:db8::1', SECRETO)).not.toBe(hashearIp('203.0.113.7', SECRETO));
	});

	it('una dirección ilegible se usa tal cual en vez de fallar', () => {
		expect(() => hashearIp('no-es-una-ip', SECRETO)).not.toThrow();
	});
});

describe('purgarIntentosVencidos', () => {
	it('borra las filas cuya ventana ya venció y conserva las vigentes', async () => {
		const prueba = await crearBdPrueba();
		try {
			await reservarIntento(prueba.bd, 'antigua', AHORA);
			await reservarIntento(prueba.bd, 'reciente', despues(VENTANA_INTENTOS_MS - 60_000));
			const mas_tarde = despues(VENTANA_INTENTOS_MS + 1000);

			const borradas = await purgarIntentosVencidos(prueba.bd, mas_tarde);

			expect(borradas).toBe(1);
			// La vigente sigue contando: sigue habiendo un intento anotado para ella.
			for (let i = 0; i < MAX_INTENTOS - 1; i++) expect(await reservarIntento(prueba.bd, 'reciente', mas_tarde)).toBe(true);
			expect(await reservarIntento(prueba.bd, 'reciente', mas_tarde)).toBe(false);
		} finally {
			prueba.cerrar();
		}
	});

	it('no falla si no hay nada que borrar', async () => {
		const prueba = await crearBdPrueba();
		try {
			expect(await purgarIntentosVencidos(prueba.bd, AHORA)).toBe(0);
		} finally {
			prueba.cerrar();
		}
	});
});
