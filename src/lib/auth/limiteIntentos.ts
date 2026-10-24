import { createHmac } from 'node:crypto';
import { eq, lte, sql } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { intentoLogin } from '../db/esquema.ts';

export const MAX_INTENTOS = 5;
export const VENTANA_INTENTOS_MS = 15 * 60 * 1000;

const IPV4_EN_IPV6 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const GRUPO_IPV6 = /^[0-9a-f]{1,4}$/i;

/**
 * Qué se cuenta como «un mismo origen». Una IPv4 es una sola dirección. En IPv6 cada conexión doméstica recibe una red
 * /64 entera (miles de millones de direcciones): contar por dirección dejaría a un atacante rotar sin límite, así que se
 * cuenta por red (los primeros 64 bits). Si la dirección no se entiende, se usa tal cual.
 */
export function origenDeRed(ip: string): string {
	const mapeada = IPV4_EN_IPV6.exec(ip);
	if (mapeada) return mapeada[1];
	if (!ip.includes(':')) return ip;

	const [izquierda, derecha, resto] = ip.split('::');
	if (resto !== undefined) return ip;
	const antes = izquierda ? izquierda.split(':') : [];
	const despues = derecha ? derecha.split(':') : [];
	const relleno = derecha === undefined ? 0 : 8 - antes.length - despues.length;
	const grupos = derecha === undefined ? antes : [...antes, ...Array<string>(Math.max(relleno, 0)).fill('0'), ...despues];

	if (grupos.length !== 8 || !grupos.every((g) => GRUPO_IPV6.test(g))) return ip;
	return `v6:${grupos
		.slice(0, 4)
		.map((g) => g.toLowerCase().padStart(4, '0'))
		.join(':')}`;
}

/** HMAC del origen de red: permite contar intentos sin guardar nunca la IP en claro. */
export const hashearIp = (ip: string, secreto: string): string =>
	createHmac('sha256', secreto).update(`ip:${origenDeRed(ip)}`).digest('hex');

/**
 * Reserva un intento de login ANTES de verificar la contraseña. Es una sola sentencia atómica, así que una
 * ráfaga de peticiones simultáneas no puede colarse. Devuelve `false` cuando ya se agotaron los intentos de
 * la ventana (en ese caso no hay que gastar tiempo de CPU en verificar la contraseña).
 * Un login correcto debe llamar a `limpiarIntentos`.
 */
export async function reservarIntento(bd: Bd, ipHash: string, ahora: Date): Promise<boolean> {
	const ahoraSeg = ahora.getTime() / 1000;
	const limiteVencida = (ahora.getTime() - VENTANA_INTENTOS_MS) / 1000;
	const vencida = sql`${intentoLogin.ventanaInicio} <= ${limiteVencida}`;

	const [fila] = await bd
		.insert(intentoLogin)
		.values({ ipHash, ventanaInicio: ahora, conteo: 1 })
		.onConflictDoUpdate({
			target: intentoLogin.ipHash,
			set: {
				conteo: sql`case when ${vencida} then 1 else ${intentoLogin.conteo} + 1 end`,
				ventanaInicio: sql`case when ${vencida} then ${ahoraSeg} else ${intentoLogin.ventanaInicio} end`,
			},
		})
		.returning({ conteo: intentoLogin.conteo });

	return fila.conteo <= MAX_INTENTOS;
}

export async function limpiarIntentos(bd: Bd, ipHash: string): Promise<void> {
	await bd.delete(intentoLogin).where(eq(intentoLogin.ipHash, ipHash));
}

/** Borra las filas cuya ventana ya venció (nadie volverá a necesitarlas) y devuelve cuántas eran. */
export async function purgarIntentosVencidos(bd: Bd, ahora: Date): Promise<number> {
	const limite = new Date(ahora.getTime() - VENTANA_INTENTOS_MS);
	const borradas = await bd.delete(intentoLogin).where(lte(intentoLogin.ventanaInicio, limite)).returning({ ipHash: intentoLogin.ipHash });
	return borradas.length;
}
