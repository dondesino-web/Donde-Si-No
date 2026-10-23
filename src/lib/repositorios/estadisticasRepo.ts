import { inArray, sql } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { estadisticaDiaria } from '../db/esquema.ts';
import { EVENTOS_ESTADISTICA, type EventoEstadistica } from '../dominio/tipos.ts';

export type ConteosDia = Record<EventoEstadistica, number>;

export interface FilaDia {
	fecha: string;
	conteos: ConteosDia;
}

const conteosEnCero = (): ConteosDia => Object.fromEntries(EVENTOS_ESTADISTICA.map((evento) => [evento, 0])) as ConteosDia;

/**
 * Suma 1 al contador del día y del evento en una sola sentencia (atómica): varios eventos simultáneos no se pisan.
 * Solo guarda contadores: ni cookies, ni IPs, ni nada que identifique a una persona.
 */
export async function registrarEvento(bd: Bd, evento: EventoEstadistica, fecha: string): Promise<void> {
	await bd
		.insert(estadisticaDiaria)
		.values({ fecha, evento, conteo: 1 })
		.onConflictDoUpdate({
			target: [estadisticaDiaria.fecha, estadisticaDiaria.evento],
			set: { conteo: sql`${estadisticaDiaria.conteo} + 1` },
		});
}

/** Un registro por cada fecha pedida y en ese orden, con todos los eventos (en cero si ese día no hubo movimiento). */
export async function conteosPorDia(bd: Bd, fechas: string[]): Promise<FilaDia[]> {
	if (fechas.length === 0) return [];

	const filas = await bd.select().from(estadisticaDiaria).where(inArray(estadisticaDiaria.fecha, fechas));
	const porFecha = new Map<string, ConteosDia>(fechas.map((fecha) => [fecha, conteosEnCero()]));
	for (const { fecha, evento, conteo } of filas) {
		const dia = porFecha.get(fecha);
		if (dia) dia[evento] = conteo;
	}
	return fechas.map((fecha) => ({ fecha, conteos: porFecha.get(fecha)! }));
}

export function totales(dias: FilaDia[]): ConteosDia {
	const suma = conteosEnCero();
	for (const { conteos } of dias) {
		for (const evento of EVENTOS_ESTADISTICA) suma[evento] += conteos[evento];
	}
	return suma;
}
