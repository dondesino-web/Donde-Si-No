import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	MAX_INTENTOS,
	VENTANA_INTENTOS_MS,
	hashearIp,
	limpiarIntentos,
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
