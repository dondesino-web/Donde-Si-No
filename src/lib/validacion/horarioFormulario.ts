import { DIAS_SEMANA, type DiaSemana, type Horario, type RangoHorario } from '../dominio/tipos.ts';
import { cadena } from './comun.ts';

export type ResultadoHorario = { ok: true; horario: Horario } | { ok: false; errores: Record<string, string> };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const TRAMOS_POR_DIA = 2;

const aMinutos = (hora: string): number => {
	const [h, m] = hora.split(':').map(Number);
	return h * 60 + m;
};
const cruzaMedianoche = (tramo: RangoHorario): boolean => aMinutos(tramo.cierra) <= aMinutos(tramo.abre);

/** Nombre del campo del formulario: `horario_lun_abre1`, `horario_lun_cierra2`… */
export const campoHorario = (dia: DiaSemana, momento: 'abre' | 'cierra', tramo: number): string => `horario_${dia}_${momento}${tramo}`;

/** Todos los nombres de campo del horario (para devolverlos al formulario si hay errores). */
export const CAMPOS_HORARIO: string[] = DIAS_SEMANA.flatMap((dia) =>
	Array.from({ length: TRAMOS_POR_DIA }, (_, i) => [campoHorario(dia, 'abre', i + 1), campoHorario(dia, 'cierra', i + 1)]).flat(),
);

/** Devuelve el error del día, o `undefined` si los tramos son coherentes. Recibe los tramos ya ordenados por apertura. */
function errorDelDia(tramos: RangoHorario[]): string | undefined {
	if (tramos.some((t) => !HORA.test(t.abre) || !HORA.test(t.cierra))) return 'Usa horas válidas, por ejemplo 12:00.';
	if (tramos.some((t) => t.abre === t.cierra)) return 'La hora de cierre no puede ser igual a la de apertura.';

	const [primero, segundo] = tramos;
	if (!segundo) return undefined;
	if (cruzaMedianoche(primero)) return 'El tramo que pasa la medianoche debe ser el último del día.';
	if (aMinutos(segundo.abre) < aMinutos(primero.cierra)) return 'Los dos tramos del día no pueden superponerse.';
	return undefined;
}

/**
 * Lee el horario del formulario: hasta dos tramos por día. Un día sin tramos queda cerrado y no se guarda;
 * si ningún día tiene tramos, el horario queda «por confirmar» (objeto vacío).
 */
export function parsearHorario(formulario: FormData): ResultadoHorario {
	const horario: Horario = {};
	const errores: Record<string, string> = {};

	for (const dia of DIAS_SEMANA) {
		const escritos = Array.from({ length: TRAMOS_POR_DIA }, (_, i) => ({
			abre: cadena(formulario, campoHorario(dia, 'abre', i + 1)).trim(),
			cierra: cadena(formulario, campoHorario(dia, 'cierra', i + 1)).trim(),
		})).filter((t) => t.abre !== '' || t.cierra !== '');
		if (escritos.length === 0) continue;

		if (escritos.some((t) => t.abre === '' || t.cierra === '')) {
			errores[`horario_${dia}`] = 'Indica la hora de apertura y la de cierre.';
			continue;
		}

		const ordenados = [...escritos].sort((a, b) => (HORA.test(a.abre) && HORA.test(b.abre) ? aMinutos(a.abre) - aMinutos(b.abre) : 0));
		const error = errorDelDia(ordenados);
		if (error) errores[`horario_${dia}`] = error;
		else horario[dia] = ordenados;
	}

	return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, horario };
}
