const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_MAXIMOS = 366;

function aUtc(fecha: string): number {
	const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
	if (!partes) throw new Error(`Fecha no válida: ${fecha}`);
	const [anio, mes, dia] = partes.slice(1).map(Number);
	const instante = Date.UTC(anio, mes - 1, dia);
	const normalizada = new Date(instante);
	// `Date.UTC` «corrige» fechas imposibles (30 de febrero): se rechazan.
	if (normalizada.getUTCFullYear() !== anio || normalizada.getUTCMonth() !== mes - 1 || normalizada.getUTCDate() !== dia) {
		throw new Error(`Fecha no válida: ${fecha}`);
	}
	return instante;
}

/**
 * Los `dias` días que terminan en `hasta` (`YYYY-MM-DD`), del más antiguo al más reciente. Se calcula sobre el calendario
 * (UTC), así que no le afectan los cambios de horario de verano.
 */
export function rangoDeDias(hasta: string, dias: number): string[] {
	if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS) throw new Error(`Cantidad de días no válida: ${dias}`);
	const final = aUtc(hasta);
	return Array.from({ length: dias }, (_, i) => new Date(final - (dias - 1 - i) * MS_POR_DIA).toISOString().slice(0, 10));
}
