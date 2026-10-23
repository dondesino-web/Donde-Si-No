import { DIAS_SEMANA, type DiaSemana, type Horario, type RangoHorario } from './tipos.ts';

/*
 * Todo el cálculo se hace en hora de Chile continental, sin importar la zona del servidor
 * (Vercel corre en UTC) ni la del visitante (un turista con el celular en otra zona).
 */
const ZONA_CHILE = 'America/Santiago';

const DIA_POR_ABREVIATURA: Record<string, DiaSemana> = {
	Mon: 'lun',
	Tue: 'mar',
	Wed: 'mie',
	Thu: 'jue',
	Fri: 'vie',
	Sat: 'sab',
	Sun: 'dom',
};

const formatoMomento = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONA_CHILE,
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});
const formatoFecha = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_CHILE });

export type EstadoApertura = { tipo: 'sin-horario' } | { tipo: 'abierto'; cierra: string } | { tipo: 'cerrado' };

export interface GrupoHorario {
	dias: DiaSemana[];
	rangos: RangoHorario[];
}

export function momentoLocal(fecha: Date): { dia: DiaSemana; minutos: number } {
	const partes = Object.fromEntries(formatoMomento.formatToParts(fecha).map((p) => [p.type, p.value]));
	return { dia: DIA_POR_ABREVIATURA[partes.weekday], minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}

/** Fecha `YYYY-MM-DD` en Chile: decide qué promociones y menú del día corresponden a «hoy». */
export function fechaLocalISO(fecha: Date): string {
	return formatoFecha.format(fecha);
}

const aMinutos = (hora: string): number => {
	const [h, m] = hora.split(':').map(Number);
	return h * 60 + m;
};
const cruzaMedianoche = (rango: RangoHorario): boolean => aMinutos(rango.cierra) <= aMinutos(rango.abre);
const diaAnterior = (dia: DiaSemana): DiaSemana => DIAS_SEMANA[(DIAS_SEMANA.indexOf(dia) + 6) % 7];

export function tieneHorario(horario: Horario): boolean {
	return DIAS_SEMANA.some((dia) => (horario[dia]?.length ?? 0) > 0);
}

export function estadoApertura(horario: Horario, fecha: Date): EstadoApertura {
	if (!tieneHorario(horario)) return { tipo: 'sin-horario' };

	const { dia, minutos } = momentoLocal(fecha);
	const deHoy = (horario[dia] ?? []).find(
		(r) => minutos >= aMinutos(r.abre) && (cruzaMedianoche(r) || minutos < aMinutos(r.cierra)),
	);
	// Un rango de ayer que cruza la medianoche (p. ej. 12:00–01:00) sigue vigente de madrugada.
	const deAyer = (horario[diaAnterior(dia)] ?? []).find((r) => cruzaMedianoche(r) && minutos < aMinutos(r.cierra));
	const rango = deHoy ?? deAyer;

	return rango ? { tipo: 'abierto', cierra: rango.cierra } : { tipo: 'cerrado' };
}

const mismosRangos = (a: RangoHorario[], b: RangoHorario[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Agrupa días consecutivos con el mismo horario para mostrarlo compacto («lunes a jueves 12:00–01:00»). */
export function agruparHorario(horario: Horario): GrupoHorario[] {
	if (!tieneHorario(horario)) return [];

	return DIAS_SEMANA.reduce<GrupoHorario[]>((grupos, dia) => {
		const rangos = horario[dia] ?? [];
		const ultimo = grupos.at(-1);
		if (ultimo && mismosRangos(ultimo.rangos, rangos)) {
			return [...grupos.slice(0, -1), { ...ultimo, dias: [...ultimo.dias, dia] }];
		}
		return [...grupos, { dias: [dia], rangos }];
	}, []);
}
