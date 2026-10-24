import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { obtenerAlmacen } from '../../../lib/almacenamiento/index.ts';
import { limpiarHuerfanas } from '../../../lib/almacenamiento/limpieza.ts';
import { autorizadoPorCron } from '../../../lib/auth/cron.ts';
import { purgarIntentosVencidos } from '../../../lib/auth/limiteIntentos.ts';
import { obtenerBd } from '../../../lib/db/index.ts';

// La invoca el cron diario de Vercel (ver vercel.json). Excluida de la caché ISR y del panel: se autentica sola.
export const prerender = false;

const respuesta = (cuerpo: object, status: number): Response =>
	new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Mantenimiento diario: borra las fotos que ningún registro usa y las filas vencidas del límite de login. */
export const GET: APIRoute = async ({ request }) => {
	if (!CRON_SECRET) return respuesta({ error: 'La limpieza no está configurada (falta CRON_SECRET).' }, 503);
	if (!autorizadoPorCron(request.headers.get('authorization'), CRON_SECRET)) return respuesta({ error: 'No autorizado' }, 401);

	const ahora = new Date();
	const bd = obtenerBd();
	const fotos = await limpiarHuerfanas({ almacen: obtenerAlmacen(), bd, ahora });
	const intentosPurgados = await purgarIntentosVencidos(bd, ahora);
	return respuesta({ ...fotos, intentosPurgados }, 200);
};
