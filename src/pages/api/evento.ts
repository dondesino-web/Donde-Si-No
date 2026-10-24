import type { APIRoute } from 'astro';
import { obtenerBd } from '../../lib/db/index.ts';
import { fechaLocalISO } from '../../lib/dominio/horario.ts';
import { leerCuerpoLimitado } from '../../lib/estadisticas/cuerpo.ts';
import { esBot, esMismoOrigen, leerEventoPublico } from '../../lib/estadisticas/eventos.ts';
import { registrarEvento } from '../../lib/repositorios/estadisticasRepo.ts';

// Excluida de la caché ISR (ver astro.config.mjs): cada evento debe llegar al servidor.
export const prerender = false;

const CUERPO_MAXIMO = 256;
const respuesta = (status: number): Response => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Beacon de la carta (`navigator.sendBeacon`): el cuerpo es solo el nombre de un evento de una lista cerrada.
 * No usa cookies ni guarda IPs: solo suma 1 al contador del día. Sin respuesta útil para el navegador (204).
 */
export const POST: APIRoute = async ({ request, url, locals }) => {
	if (!esMismoOrigen(request.headers, url.origin)) return respuesta(403);

	// Respuesta rápida si el tamaño declarado ya es excesivo; el tope real se aplica al leer (puede no haber Content-Length).
	if (Number(request.headers.get('content-length')) > CUERPO_MAXIMO) return respuesta(413);
	const cuerpo = await leerCuerpoLimitado(request, CUERPO_MAXIMO);
	if (cuerpo === undefined) return respuesta(413);

	const evento = leerEventoPublico(cuerpo);
	if (!evento) return respuesta(400);

	// Robots y el propio panel (quien administra tiene sesión) no cuentan, pero tampoco se les avisa: siempre 204.
	if (!esBot(request.headers.get('user-agent')) && !locals.haySesion) {
		try {
			await registrarEvento(obtenerBd(), evento, fechaLocalISO(new Date()));
		} catch (error) {
			console.error('[estadísticas] no se pudo registrar el evento', evento, error);
		}
	}
	return respuesta(204);
};
