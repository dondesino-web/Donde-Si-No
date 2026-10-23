import { sql } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';

/**
 * De las URLs dadas, devuelve las que ya no usa ningún producto, promoción ni foto de la galería.
 * Se consulta antes de borrar archivos: una foto puede seguir en uso por otro registro (o por una pestaña
 * con el formulario abierto desde antes), y borrarla dejaría una imagen rota en la carta pública.
 * Las URLs se comparan como texto literal (`instr`), no como patrón: `%` y `_` no son comodines.
 */
export async function urlsSinUso(bd: Bd, urls: string[]): Promise<string[]> {
	const sinUso: string[] = [];
	for (const url of urls) {
		// Las URLs se guardan dentro de un JSON: se busca la cadena entre comillas para no confundir prefijos.
		const comillada = JSON.stringify(url);
		const filas = await bd.all<{ usos: number }>(sql`
			select (
				(select count(*) from producto where instr(imagen, ${comillada}) > 0) +
				(select count(*) from promocion where instr(imagen, ${comillada}) > 0) +
				(select count(*) from foto_destacada where instr(imagen, ${comillada}) > 0)
			) as usos
		`);
		if (filas[0].usos === 0) sinUso.push(url);
	}
	return sinUso;
}
