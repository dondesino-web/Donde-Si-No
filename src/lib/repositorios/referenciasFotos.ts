import { isNotNull } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { fotoDestacada, producto, promocion } from '../db/esquema.ts';

/**
 * De las URLs dadas, devuelve las que ya no usa ningún producto, promoción ni foto de la galería.
 * Se consulta antes de borrar archivos: una foto puede seguir en uso por otro registro (o por una pestaña
 * con el formulario abierto desde antes), y borrarla dejaría una imagen rota en la carta pública.
 * Son solo tres consultas en total (no una por foto) y la comparación es por igualdad exacta de texto.
 */
export async function urlsSinUso(bd: Bd, urls: string[]): Promise<string[]> {
	if (urls.length === 0) return [];

	const [deProductos, dePromociones, deGaleria] = await Promise.all([
		bd.select({ imagen: producto.imagen }).from(producto).where(isNotNull(producto.imagen)),
		bd.select({ imagen: promocion.imagen }).from(promocion).where(isNotNull(promocion.imagen)),
		bd.select({ imagen: fotoDestacada.imagen }).from(fotoDestacada),
	]);

	const enUso = new Set<string>();
	for (const { imagen } of [...deProductos, ...dePromociones, ...deGaleria]) {
		if (!imagen) continue;
		enUso.add(imagen.sm);
		enUso.add(imagen.lg);
	}
	return urls.filter((url) => !enUso.has(url));
}
