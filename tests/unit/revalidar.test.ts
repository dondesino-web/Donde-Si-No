import { describe, expect, it, vi } from 'vitest';
import { RUTAS_PUBLICAS, revalidar, type Peticion } from '../../src/lib/revalidar.ts';

const SITIO = 'https://www.donde-sino.com';
const TOKEN = 't'.repeat(32);

describe('revalidar', () => {
	it('pide un HEAD con el token a cada página pública', async () => {
		const peticion = vi.fn<Peticion>(async () => new Response(null, { status: 200 }));

		const resultado = await revalidar({ sitio: SITIO, token: TOKEN, peticion });

		expect(resultado).toEqual({ ok: true, omitido: false, fallidas: [] });
		expect(RUTAS_PUBLICAS).toEqual(['/', '/en/', '/imprimir', '/en/print']);
		expect(peticion.mock.calls.map(([url]) => url)).toEqual(RUTAS_PUBLICAS.map((r) => `${SITIO}${r}`));
		for (const [, init] of peticion.mock.calls) {
			expect(init.method).toBe('HEAD');
			expect(init.redirect).toBe('manual');
			expect(init.signal).toBeInstanceOf(AbortSignal);
			expect(init.headers).toEqual({ 'x-prerender-revalidate': TOKEN });
		}
	});

	it('trata una redirección como fallo para no reenviar el token a otro host', async () => {
		const peticion = vi.fn<Peticion>(async () => new Response(null, { status: 302, headers: { Location: 'https://otro.example/' } }));

		const resultado = await revalidar({ sitio: SITIO, token: TOKEN, peticion });

		expect(resultado.ok).toBe(false);
		expect(resultado.fallidas).toEqual([...RUTAS_PUBLICAS]);
	});

	it('se omite sin token (desarrollo local) y no hace peticiones', async () => {
		const peticion = vi.fn();

		const resultado = await revalidar({ sitio: SITIO, token: undefined, peticion });

		expect(resultado).toEqual({ ok: true, omitido: true, fallidas: [] });
		expect(peticion).not.toHaveBeenCalled();
	});

	it('no lanza si una página falla: informa cuáles', async () => {
		const peticion = vi.fn(async (url: string) => {
			if (url.endsWith('/en/')) throw new Error('red caída');
			return new Response(null, { status: url.endsWith('/imprimir') ? 500 : 200 });
		});

		const resultado = await revalidar({ sitio: SITIO, token: TOKEN, peticion });

		expect(resultado).toEqual({ ok: false, omitido: false, fallidas: ['/en/', '/imprimir'] });
	});
});
