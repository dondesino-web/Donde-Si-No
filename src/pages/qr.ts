import type { APIRoute } from 'astro';
import { obtenerBd } from '../lib/db/index.ts';
import { fechaLocalISO } from '../lib/dominio/horario.ts';
import { esBot } from '../lib/estadisticas/eventos.ts';
import { registrarEvento } from '../lib/repositorios/estadisticasRepo.ts';

// Excluida de la caché ISR (ver astro.config.mjs): cada escaneo debe llegar al servidor.
export const prerender = false;

/** Los navegadores que precargan un enlace (sin que la persona lo abra) lo avisan con estas cabeceras. */
const esPrecarga = (cabeceras: Headers): boolean =>
	[cabeceras.get('sec-purpose'), cabeceras.get('purpose'), cabeceras.get('x-moz')].some((valor) => valor?.toLowerCase().includes('prefetch'));

/**
 * El destino del código QR impreso. Cuenta el escaneo y redirige a la carta.
 * Como el QR apunta siempre aquí (y no a la carta), el destino se puede cambiar sin reimprimir nada.
 * La redirección nunca depende de las estadísticas: si no se pudo contar, la persona igual ve la carta.
 */
export const GET: APIRoute = async ({ request, locals }) => {
	const cuenta = request.method === 'GET' && !esBot(request.headers.get('user-agent')) && !esPrecarga(request.headers) && !locals.haySesion;
	if (cuenta) {
		try {
			await registrarEvento(obtenerBd(), 'qr_escaneo', fechaLocalISO(new Date()));
		} catch (error) {
			console.error('[estadísticas] no se pudo contar el escaneo del QR', error);
		}
	}

	// No se cachea: una redirección en caché haría que los siguientes escaneos no llegaran al servidor.
	return new Response(null, { status: 302, headers: { Location: '/', 'Cache-Control': 'no-store' } });
};
