import type { Bd } from '../db/cliente.ts';
import { urlsSinUso } from '../repositorios/referenciasFotos.ts';
import type { AlmacenImagenes } from './almacen.ts';

/** Una subida más reciente que esto puede ser un formulario abierto que todavía no se guardó: no se toca. */
export const EDAD_MINIMA_MS = 24 * 60 * 60 * 1000;
/** Tope por ejecución: la limpieza es diaria y un error nunca debería poder borrar todo de golpe. */
export const MAX_ELIMINACIONES_POR_EJECUCION = 100;
/**
 * Con tantos archivos antiguos o más, que TODOS parezcan huérfanos es señal de un problema (una base de datos equivocada o
 * vacía, o un entorno de pruebas que comparte el almacén), no de basura. Una carta pequeña también queda protegida.
 */
const LOTE_SOSPECHOSO = 5;

export interface ResultadoLimpieza {
	revisadas: number;
	eliminadas: number;
	fallidas: number;
	/** `true` si se detuvo por el freno de seguridad sin borrar nada. */
	abortada: boolean;
}

interface Opciones {
	almacen: AlmacenImagenes;
	bd: Bd;
	ahora: Date;
}

/**
 * Borra del almacén las fotos que ningún producto, promoción ni foto de la galería usa (subidas que nunca se guardaron o
 * restos de un borrado que falló). Es lo único que borra archivos «en bloque», así que tiene tres frenos:
 * solo toca archivos de más de un día, borra a lo sumo {@link MAX_ELIMINACIONES_POR_EJECUCION} por vez y se detiene si en un
 * lote grande todo parece huérfano (por ejemplo, si apuntaran a una base de datos equivocada o vacía).
 */
export async function limpiarHuerfanas({ almacen, bd, ahora }: Opciones): Promise<ResultadoLimpieza> {
	const vacia: ResultadoLimpieza = { revisadas: 0, eliminadas: 0, fallidas: 0, abortada: false };
	if (!almacen.listar) return vacia;

	const limite = ahora.getTime() - EDAD_MINIMA_MS;
	const antiguas = (await almacen.listar()).filter((archivo) => archivo.subidoEn.getTime() <= limite).map((archivo) => archivo.url);
	if (antiguas.length === 0) return vacia;

	const huerfanas = await urlsSinUso(bd, antiguas);
	if (antiguas.length >= LOTE_SOSPECHOSO && huerfanas.length === antiguas.length) {
		console.error(`[fotos] limpieza detenida: las ${antiguas.length} fotos antiguas parecen huérfanas; revisa que la base de datos sea la correcta.`);
		return { revisadas: antiguas.length, eliminadas: 0, fallidas: 0, abortada: true };
	}

	let eliminadas = 0;
	let fallidas = 0;
	for (const url of huerfanas.slice(0, MAX_ELIMINACIONES_POR_EJECUCION)) {
		try {
			await almacen.eliminar(url);
			eliminadas++;
		} catch (error) {
			fallidas++;
			console.error('[fotos] no se pudo borrar una foto huérfana', url, error);
		}
	}
	return { revisadas: antiguas.length, eliminadas, fallidas, abortada: false };
}
