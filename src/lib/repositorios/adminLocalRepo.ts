import { eq } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { negocio } from '../db/esquema.ts';
import type { Horario, Servicios } from '../dominio/tipos.ts';
import type { Negocio } from './cartaRepo.ts';

/** Lo que se puede editar del local. El nombre de la marca no está aquí: aparece en logo, datos estructurados y QR. */
export interface DatosNegocio {
	esloganEs: string;
	esloganEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	telefono: string | null;
	whatsapp: string | null;
	direccion: string;
	comuna: string;
	region: string;
	codigoPostal: string | null;
	latitud: number | null;
	longitud: number | null;
	mapsUrl: string | null;
	resenaUrl: string | null;
	instagramUrl: string | null;
	facebookUrl: string | null;
	ubereatsUrl: string | null;
	rangoPrecio: string | null;
	servicios: Servicios;
	horario: Horario;
}

/** El local es siempre una sola fila (`id = 1`). */
const ID_NEGOCIO = 1;

export function obtenerNegocioAdmin(bd: Bd): Promise<Negocio | undefined> {
	return bd.select().from(negocio).where(eq(negocio.id, ID_NEGOCIO)).get();
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
