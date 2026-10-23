import { createHmac, timingSafeEqual } from 'node:crypto';

export const NOMBRE_COOKIE_SESION = 'sesion';
export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;
const LARGO_MINIMO_SECRETO = 32;

/*
 * Token sin estado: `<vence en ms>.<HMAC-SHA256 base64url>`. Hay un solo administrador, así que no
 * hace falta guardar sesiones: cambiar `SESSION_SECRET` cierra todas las sesiones a la vez.
 */
const firmar = (secreto: string, vence: string): string => createHmac('sha256', secreto).update(vence).digest('base64url');

export function crearTokenSesion(secreto: string, ahora: Date): string {
	if (secreto.length < LARGO_MINIMO_SECRETO) {
		throw new Error(`SESSION_SECRET debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres.`);
	}
	const vence = String(ahora.getTime() + DURACION_SESION_MS);
	return `${vence}.${firmar(secreto, vence)}`;
}

export function verificarTokenSesion(secreto: string, token: string | undefined, ahora: Date): boolean {
	if (!token || secreto.length < LARGO_MINIMO_SECRETO) return false;

	const [vence, firma, sobrante] = token.split('.');
	if (!vence || !firma || sobrante !== undefined || !/^\d+$/.test(vence)) return false;

	const esperada = Buffer.from(firmar(secreto, vence));
	const recibida = Buffer.from(firma);
	if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return false;

	return ahora.getTime() < Number(vence);
}
