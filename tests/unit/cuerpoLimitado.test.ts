import { describe, expect, it } from 'vitest';
import { leerCuerpoLimitado } from '../../src/lib/estadisticas/cuerpo.ts';

const peticion = (cuerpo: BodyInit | null | ReadableStream<Uint8Array>): Request =>
	new Request('http://localhost/api/evento', { method: 'POST', body: cuerpo, ...(cuerpo instanceof ReadableStream ? { duplex: 'half' } : {}) } as RequestInit);

/** Un cuerpo que entrega `trozos` de `tamano` bytes y cuenta cuántos se llegaron a pedir (sin Content-Length, como en chunked). */
function flujo(trozos: number, tamano: number): { cuerpo: ReadableStream<Uint8Array>; leidos: () => number } {
	let entregados = 0;
	const cuerpo = new ReadableStream<Uint8Array>({
		pull(controlador) {
			if (entregados >= trozos) return controlador.close();
			entregados++;
			controlador.enqueue(new Uint8Array(tamano).fill(97));
		},
	});
	return { cuerpo, leidos: () => entregados };
}

describe('leerCuerpoLimitado', () => {
	it('lee un cuerpo pequeño como texto', async () => {
		expect(await leerCuerpoLimitado(peticion('clic_mapa'), 256)).toBe('clic_mapa');
	});

	it('sin cuerpo devuelve texto vacío', async () => {
		expect(await leerCuerpoLimitado(new Request('http://localhost/x', { method: 'POST' }), 256)).toBe('');
	});

	it('acepta un cuerpo justo del tamaño máximo', async () => {
		expect(await leerCuerpoLimitado(peticion('a'.repeat(256)), 256)).toBe('a'.repeat(256));
	});

	it('devuelve undefined si el cuerpo supera el máximo', async () => {
		expect(await leerCuerpoLimitado(peticion('a'.repeat(257)), 256)).toBeUndefined();
	});

	it('deja de leer en cuanto se pasa del máximo, sin traer todo el cuerpo a memoria', async () => {
		const { cuerpo, leidos } = flujo(10_000, 1024);

		expect(await leerCuerpoLimitado(peticion(cuerpo), 256)).toBeUndefined();
		expect(leidos()).toBeLessThan(10);
	});

	it('entiende texto con tildes y emoji sin partir los caracteres', async () => {
		expect(await leerCuerpoLimitado(peticion('añ✓'), 256)).toBe('añ✓');
	});
});
