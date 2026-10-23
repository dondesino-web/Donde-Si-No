import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { intentoLogin } from '../db/esquema.ts';

export const MAX_INTENTOS = 5;
export const VENTANA_INTENTOS_MS = 15 * 60 * 1000;

/** HMAC de la IP: permite contar intentos por origen sin guardar nunca la IP en claro. */
export const hashearIp = (ip: string, secreto: string): string =>
	createHmac('sha256', secreto).update(`ip:${ip}`).digest('hex');

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
