import { asc, eq, max } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { menuDia, promocion } from '../db/esquema.ts';
import type { Imagen } from '../dominio/tipos.ts';
import type { DatosMenuDiaFormulario, DatosPromocionFormulario } from '../validacion/promociones.ts';
import { moverEnGrupo, type Direccion } from './adminCartaRepo.ts';
import type { MenuDia, Promocion } from './cartaRepo.ts';

/** Lo que se guarda de una promoción: lo que valida el formulario, más la foto (`undefined` = conservar; `null` = quitarla). */
export type DatosPromocion = DatosPromocionFormulario & { imagen?: Imagen | null };

export type DatosMenuDia = DatosMenuDiaFormulario;

/** Todas las promociones, también las apagadas, vencidas o programadas: es lo que ve quien administra. */
export function listarPromociones(bd: Bd): Promise<Promocion[]> {
	return bd.select().from(promocion).orderBy(asc(promocion.orden), asc(promocion.id));
}

export function obtenerPromocion(bd: Bd, id: number): Promise<Promocion | undefined> {
	return bd.select().from(promocion).where(eq(promocion.id, id)).get();
}

export async function crearPromocion(bd: Bd, datos: DatosPromocion): Promise<Promocion> {
	const [fila] = await bd.select({ ultimo: max(promocion.orden) }).from(promocion);
	const [creada] = await bd
		.insert(promocion)
		.values({ ...datos, orden: fila.ultimo === null ? 0 : fila.ultimo + 1 })
		.returning();
	return creada;
}

export async function actualizarPromocion(bd: Bd, id: number, datos: DatosPromocion): Promise<boolean> {
	const filas = await bd.update(promocion).set(datos).where(eq(promocion.id, id)).returning({ id: promocion.id });
	return filas.length > 0;
}

export async function establecerPromocionActiva(bd: Bd, id: number, activa: boolean): Promise<boolean> {
	const filas = await bd.update(promocion).set({ activa }).where(eq(promocion.id, id)).returning({ id: promocion.id });
	return filas.length > 0;
}

export async function eliminarPromocion(bd: Bd, id: number): Promise<boolean> {
	const filas = await bd.delete(promocion).where(eq(promocion.id, id)).returning({ id: promocion.id });
	return filas.length > 0;
}

export async function moverPromocion(bd: Bd, id: number, direccion: Direccion): Promise<boolean> {
	const todas = await bd.select({ id: promocion.id, orden: promocion.orden }).from(promocion);
	return moverEnGrupo(bd, todas, id, direccion, (ejecutor, idFila, orden) => ejecutor.update(promocion).set({ orden }).where(eq(promocion.id, idFila)));
}

/** Hay un único menú del día: la fila más antigua. */
export function obtenerMenuDiaAdmin(bd: Bd): Promise<MenuDia | undefined> {
	return bd.select().from(menuDia).orderBy(asc(menuDia.id)).get();
}

/** Id fijo de la única fila del menú: dos primeros guardados simultáneos chocan en la clave y el segundo actualiza. */
const ID_MENU_DIA = 1;

/** Crea el menú la primera vez y después lo actualiza: nunca queda más de una fila. */
export async function guardarMenuDia(bd: Bd, datos: DatosMenuDia): Promise<void> {
	const actual = await obtenerMenuDiaAdmin(bd);
	if (actual) {
		await bd.update(menuDia).set(datos).where(eq(menuDia.id, actual.id));
		return;
	}
	await bd
		.insert(menuDia)
		.values({ ...datos, id: ID_MENU_DIA })
		.onConflictDoUpdate({ target: menuDia.id, set: datos });
}
