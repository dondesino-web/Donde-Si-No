import { asc, eq, sql } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { fotoDestacada } from '../db/esquema.ts';
import type { Imagen } from '../dominio/tipos.ts';
import { moverEnGrupo, type Direccion } from './adminCartaRepo.ts';
import type { FotoDestacada } from './cartaRepo.ts';

/** Máximo de fotos del carrusel de la carta: más haría pesada la página en el celular. */
export const MAX_FOTOS = 8;

export type ResultadoCrearFoto = { ok: true; foto: FotoDestacada } | { ok: false; motivo: 'lleno' };

export function listarFotos(bd: Bd): Promise<FotoDestacada[]> {
	return bd.select().from(fotoDestacada).orderBy(asc(fotoDestacada.orden), asc(fotoDestacada.id));
}

/**
 * Agrega una foto al final. El tope de {@link MAX_FOTOS} se aplica dentro de la misma sentencia (`HAVING count(*) < tope`),
 * así que varias subidas simultáneas no pueden pasarse del máximo.
 */
export async function crearFoto(bd: Bd, imagen: Imagen): Promise<ResultadoCrearFoto> {
	const insertadas = await bd.all<{ id: number }>(sql`
		insert into foto_destacada (imagen, orden)
		select ${JSON.stringify(imagen)}, coalesce(max(orden) + 1, 0) from foto_destacada
		having count(*) < ${MAX_FOTOS}
		returning id
	`);
	if (insertadas.length === 0) return { ok: false, motivo: 'lleno' };

	const foto = await bd.select().from(fotoDestacada).where(eq(fotoDestacada.id, insertadas[0].id)).get();
	return { ok: true, foto: foto! };
}

/** Devuelve la foto eliminada (para borrar sus archivos), o `undefined` si ya no existía. */
export async function eliminarFoto(bd: Bd, id: number): Promise<FotoDestacada | undefined> {
	const [eliminada] = await bd.delete(fotoDestacada).where(eq(fotoDestacada.id, id)).returning();
	return eliminada;
}

export async function moverFoto(bd: Bd, id: number, direccion: Direccion): Promise<boolean> {
	const todas = await bd.select({ id: fotoDestacada.id, orden: fotoDestacada.orden }).from(fotoDestacada);
	return moverEnGrupo(bd, todas, id, direccion, (ejecutor, idFila, orden) =>
		ejecutor.update(fotoDestacada).set({ orden }).where(eq(fotoDestacada.id, idFila)),
	);
}
