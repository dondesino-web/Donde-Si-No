import { timingSafeEqual } from 'node:crypto';

/** Vercel exige que `CRON_SECRET` tenga al menos 16 caracteres. */
const LARGO_MINIMO = 16;
const PREFIJO = 'Bearer ';

/**
 * ¿La petición viene del cron de Vercel? Vercel envía `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado
 * (o demasiado corto) nada se autoriza: la ruta nunca queda abierta por olvido.
 */
export function autorizadoPorCron(cabecera: string | null, secreto: string | undefined): boolean {
	if (!secreto || secreto.length < LARGO_MINIMO || !cabecera?.startsWith(PREFIJO)) return false;

	const recibido = Buffer.from(cabecera.slice(PREFIJO.length));
	const esperado = Buffer.from(secreto);
	return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
