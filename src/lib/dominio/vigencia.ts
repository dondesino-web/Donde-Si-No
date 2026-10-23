/*
 * Estado de una promoción o del menú del día respecto de «hoy» (`YYYY-MM-DD`, hora de Chile).
 * Es la misma regla que aplica la carta pública al consultar la base: sirve para explicarle al dueño
 * por qué algo que cargó todavía (o ya no) se ve.
 */

export type EstadoPromocion = 'inactiva' | 'programada' | 'vencida' | 'vigente';
export type EstadoMenuDia = 'inactivo' | 'programado' | 'vencido' | 'vigente';

export function estadoPromocion(promocion: { activa: boolean; desde: string | null; hasta: string | null }, hoy: string): EstadoPromocion {
	if (!promocion.activa) return 'inactiva';
	if (promocion.desde !== null && hoy < promocion.desde) return 'programada';
	if (promocion.hasta !== null && hoy > promocion.hasta) return 'vencida';
	return 'vigente';
}

/** Sin fecha, el menú se muestra cualquier día mientras esté activo. */
export function estadoMenuDia(menu: { activo: boolean; fecha: string | null }, hoy: string): EstadoMenuDia {
	if (!menu.activo) return 'inactivo';
	if (menu.fecha === null || menu.fecha === hoy) return 'vigente';
	return hoy < menu.fecha ? 'programado' : 'vencido';
}
