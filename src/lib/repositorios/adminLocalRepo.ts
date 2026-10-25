import { eq } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { negocio } from '../db/esquema.ts';
import type { IdTema } from '../dominio/temas.ts';
import type { DatosLocalFormulario } from '../validacion/local.ts';
import type { Negocio } from './cartaRepo.ts';

/** Lo que se puede editar del local. El nombre de la marca no está: aparece en logo, datos estructurados y QR. */
export type DatosNegocio = DatosLocalFormulario;

/** El local es siempre una sola fila (`id = 1`). */
const ID_NEGOCIO = 1;

export function obtenerNegocioAdmin(bd: Bd): Promise<Negocio | undefined> {
	return bd.select().from(negocio).where(eq(negocio.id, ID_NEGOCIO)).get();
}

/** Cambia el diseño de la carta pública. Devuelve `false` si el local aún no existe. */
export async function guardarTema(bd: Bd, tema: IdTema): Promise<boolean> {
	const filas = await bd.update(negocio).set({ tema, actualizadoEn: new Date() }).where(eq(negocio.id, ID_NEGOCIO)).returning({ id: negocio.id });
	return filas.length > 0;
}

/** Devuelve `false` si el local aún no existe (falta ejecutar la semilla). */
export async function guardarNegocio(bd: Bd, datos: DatosNegocio): Promise<boolean> {
	const filas = await bd
		.update(negocio)
		.set({ ...datos, actualizadoEn: new Date() })
		.where(eq(negocio.id, ID_NEGOCIO))
		.returning({ id: negocio.id });
	return filas.length > 0;
}
