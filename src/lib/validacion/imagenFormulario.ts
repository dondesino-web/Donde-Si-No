import { z } from 'astro/zod';
import type { SubidaFirmada } from '../almacenamiento/firma.ts';
import type { Imagen } from '../dominio/tipos.ts';
import { cadena, casilla, type ResultadoValidacion } from './comun.ts';

const MENSAJE_FOTO = 'La foto no se subió bien. Vuelve a elegirla.';
const LARGO_MAXIMO_JSON = 2000;
const LARGO_MAXIMO_ALT = 150;
const LADO_MAXIMO = 4000;

export interface OpcionesImagen {
	/** Foto que tiene ahora el producto o la promoción (`null` si no tiene). */
	actual: Imagen | null;
	/** ¿Esta URL es una foto de nuestro almacén? Impide guardar enlaces a otros sitios. */
	reconoce: (url: string) => boolean;
	/** ¿La firma de la subida es válida? Solo se aceptan fotos que este servidor acaba de emitir. */
	verifica: (subida: SubidaFirmada) => boolean;
	/** Texto alternativo si la persona no escribió uno (el nombre del producto). */
	altPorDefecto: string;
}

/** Lo que devuelve el endpoint de subida y viaja en un campo oculto del formulario. */
const subidaSchema = z.object({
	sm: z.string().max(500),
	lg: z.string().max(500),
	ancho: z.number().int().min(1).max(LADO_MAXIMO),
	alto: z.number().int().min(1).max(LADO_MAXIMO),
	firma: z.string().max(200),
});

function leerSubida(texto: string, opciones: Pick<OpcionesImagen, 'reconoce' | 'verifica'>): SubidaFirmada | undefined {
	if (texto.length > LARGO_MAXIMO_JSON) return undefined;
	let crudo: unknown;
	try {
		crudo = JSON.parse(texto);
	} catch {
		return undefined;
	}
	const analisis = subidaSchema.safeParse(crudo);
	if (!analisis.success) return undefined;
	const { sm, lg } = analisis.data;
	return opciones.reconoce(sm) && opciones.reconoce(lg) && opciones.verifica(analisis.data) ? analisis.data : undefined;
}

/**
 * Decide qué foto queda tras guardar el formulario: conservar la actual (editando solo el texto alternativo),
 * reemplazarla por una recién subida, o quitarla. «Quitar» gana sobre cualquier otra cosa.
 */
export function leerImagen(formulario: FormData, { actual, reconoce, verifica, altPorDefecto }: OpcionesImagen): ResultadoValidacion<{ imagen: Imagen | null }> {
	if (casilla(formulario, 'quitarImagen')) return { ok: true, datos: { imagen: null } };

	const subidaEscrita = cadena(formulario, 'imagen').trim();
	const subida = subidaEscrita === '' ? undefined : leerSubida(subidaEscrita, { reconoce, verifica });
	if (subidaEscrita !== '' && !subida) return { ok: false, errores: { imagen: MENSAJE_FOTO } };

	const base = subida ?? actual;
	if (!base) return { ok: true, datos: { imagen: null } };

	const altEsEscrito = cadena(formulario, 'imagenAltEs').trim();
	const altEs = altEsEscrito || (subida ? altPorDefecto.trim() : actual?.altEs) || '';
	if (altEs === '') return { ok: false, errores: { imagenAltEs: 'Describe la foto en pocas palabras (la leen quienes no pueden verla).' } };
	if (altEs.length > LARGO_MAXIMO_ALT) {
		return { ok: false, errores: { imagenAltEs: `El texto de la foto no puede pasar de ${LARGO_MAXIMO_ALT} caracteres.` } };
	}

	const altEnEscrito = cadena(formulario, 'imagenAltEn').trim();
	if (altEnEscrito.length > LARGO_MAXIMO_ALT) {
		return { ok: false, errores: { imagenAltEn: `El texto de la foto no puede pasar de ${LARGO_MAXIMO_ALT} caracteres.` } };
	}
	// Si el campo viene en el formulario manda lo escrito (vacío = sin traducción); si no viene, se conserva lo que había.
	const altEn = formulario.has('imagenAltEn') ? altEnEscrito : (subida ? '' : (actual?.altEn ?? ''));

	const imagen: Imagen = { sm: base.sm, lg: base.lg, ancho: base.ancho, alto: base.alto, altEs, ...(altEn ? { altEn } : {}) };
	return { ok: true, datos: { imagen } };
}

/** Archivos que quedan huérfanos al cambiar de foto y hay que borrar del almacén. */
export function urlsAEliminar(antes: Imagen | null, despues: Imagen | null): string[] {
	if (!antes) return [];
	// Cada versión se compara por separado: si la nueva foto reutiliza una de las dos, esa no se borra.
	return [antes.sm, antes.lg].filter((url) => url !== despues?.sm && url !== despues?.lg);
}
