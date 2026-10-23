import { and, asc, count, eq, like, max } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { categoria, producto } from '../db/esquema.ts';
import { slugificar } from '../dominio/slug.ts';
import type { Alergeno, Etiqueta } from '../dominio/tipos.ts';
import type { Categoria, CategoriaConProductos, Producto } from './cartaRepo.ts';

// Lo único que necesitan los actualizadores; sirve tanto para la conexión como para una transacción.
type Ejecutor = Pick<Bd, 'update'>;

export type Direccion = 'arriba' | 'abajo';

export interface DatosProducto {
	categoriaId: number;
	nombreEs: string;
	nombreEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	precio: number | null;
	alergenos: Alergeno[];
	etiquetas: Etiqueta[];
	disponible: boolean;
	destacado: boolean;
	visible: boolean;
}

export interface DatosCategoria {
	nombreEs: string;
	nombreEn: string | null;
	visible: boolean;
}

export type ResultadoEliminarCategoria = { ok: true } | { ok: false; motivo: 'tiene-productos' | 'no-existe' };

const porOrden = <T extends { orden: number; id: number }>(a: T, b: T): number => a.orden - b.orden || a.id - b.id;

/** Toda la carta, incluidos productos y categorías ocultos o vacíos: es lo que ve la persona que administra. */
export async function listarCartaAdmin(bd: Bd): Promise<CategoriaConProductos[]> {
	const [categorias, productos] = await Promise.all([
		bd.select().from(categoria).orderBy(asc(categoria.orden), asc(categoria.id)),
		bd.select().from(producto).orderBy(asc(producto.orden), asc(producto.id)),
	]);
	return categorias.map((c) => ({ ...c, productos: productos.filter((p) => p.categoriaId === c.id) }));
}

export function obtenerProducto(bd: Bd, id: number): Promise<Producto | undefined> {
	return bd.select().from(producto).where(eq(producto.id, id)).get();
}

async function siguienteOrdenProducto(bd: Bd, categoriaId: number): Promise<number> {
	const [fila] = await bd.select({ ultimo: max(producto.orden) }).from(producto).where(eq(producto.categoriaId, categoriaId));
	return fila.ultimo === null ? 0 : fila.ultimo + 1;
}

export async function crearProducto(bd: Bd, datos: DatosProducto): Promise<Producto> {
	const orden = await siguienteOrdenProducto(bd, datos.categoriaId);
	const [creado] = await bd.insert(producto).values({ ...datos, orden }).returning();
	return creado;
}

export async function actualizarProducto(bd: Bd, id: number, datos: DatosProducto): Promise<boolean> {
	const actual = await obtenerProducto(bd, id);
	if (!actual) return false;

	// Al cambiar de categoría el producto pasa al final de la nueva, para no chocar con el orden de ahí.
	const orden = actual.categoriaId === datos.categoriaId ? actual.orden : await siguienteOrdenProducto(bd, datos.categoriaId);
	await bd.update(producto).set({ ...datos, orden, actualizadoEn: new Date() }).where(eq(producto.id, id));
	return true;
}

async function modificarProducto(bd: Bd, id: number, cambios: Partial<Pick<Producto, 'precio' | 'disponible'>>): Promise<boolean> {
	const filas = await bd.update(producto).set({ ...cambios, actualizadoEn: new Date() }).where(eq(producto.id, id)).returning({ id: producto.id });
	return filas.length > 0;
}

export const cambiarPrecio = (bd: Bd, id: number, precio: number | null): Promise<boolean> => modificarProducto(bd, id, { precio });

export const establecerDisponible = (bd: Bd, id: number, disponible: boolean): Promise<boolean> =>
	modificarProducto(bd, id, { disponible });

export async function eliminarProducto(bd: Bd, id: number): Promise<boolean> {
	const filas = await bd.delete(producto).where(eq(producto.id, id)).returning({ id: producto.id });
	return filas.length > 0;
}

/**
 * Intercambia la posición con el vecino y reescribe 0..n-1 en todo el grupo: así funciona aunque los
 * valores guardados estén repetidos (la semilla los deja todos en 0). Devuelve `false` si ya estaba en el extremo.
 */
async function moverEnGrupo(bd: Bd, ids: { orden: number; id: number }[], id: number, direccion: Direccion, actualizar: (ejecutor: Ejecutor, id: number, orden: number) => Promise<unknown>): Promise<boolean> {
	const ordenados = [...ids].sort(porOrden).map((fila) => fila.id);
	const posicion = ordenados.indexOf(id);
	const destino = direccion === 'arriba' ? posicion - 1 : posicion + 1;
	if (posicion === -1 || destino < 0 || destino >= ordenados.length) return false;

	[ordenados[posicion], ordenados[destino]] = [ordenados[destino], ordenados[posicion]];
	await bd.transaction(async (tx) => {
		for (const [orden, idFila] of ordenados.entries()) await actualizar(tx, idFila, orden);
	});
	return true;
}

export async function moverProducto(bd: Bd, id: number, direccion: Direccion): Promise<boolean> {
	const actual = await obtenerProducto(bd, id);
	if (!actual) return false;

	const hermanos = await bd.select({ id: producto.id, orden: producto.orden }).from(producto).where(eq(producto.categoriaId, actual.categoriaId));
	return moverEnGrupo(bd, hermanos, id, direccion, (ejecutor, idFila, orden) => ejecutor.update(producto).set({ orden }).where(eq(producto.id, idFila)));
}

async function slugDisponible(bd: Bd, nombre: string): Promise<string> {
	const base = slugificar(nombre);
	const usados = new Set((await bd.select({ slug: categoria.slug }).from(categoria).where(like(categoria.slug, `${base}%`))).map((f) => f.slug));
	if (!usados.has(base)) return base;

	for (let n = 2; ; n++) {
		if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
	}
}

export async function crearCategoria(bd: Bd, datos: DatosCategoria): Promise<Categoria> {
	const [fila] = await bd.select({ ultimo: max(categoria.orden) }).from(categoria);
	const [creada] = await bd
		.insert(categoria)
		.values({ ...datos, slug: await slugDisponible(bd, datos.nombreEs), orden: fila.ultimo === null ? 0 : fila.ultimo + 1 })
		.returning();
	return creada;
}

/** El slug no cambia al renombrar: así los enlaces y códigos QR ya impresos siguen funcionando. */
export async function actualizarCategoria(bd: Bd, id: number, datos: DatosCategoria): Promise<boolean> {
	const filas = await bd.update(categoria).set(datos).where(eq(categoria.id, id)).returning({ id: categoria.id });
	return filas.length > 0;
}

export async function moverCategoria(bd: Bd, id: number, direccion: Direccion): Promise<boolean> {
	const todas = await bd.select({ id: categoria.id, orden: categoria.orden }).from(categoria);
	return moverEnGrupo(bd, todas, id, direccion, (ejecutor, idFila, orden) => ejecutor.update(categoria).set({ orden }).where(eq(categoria.id, idFila)));
}

export async function eliminarCategoria(bd: Bd, id: number): Promise<ResultadoEliminarCategoria> {
	const [{ total }] = await bd.select({ total: count() }).from(producto).where(eq(producto.categoriaId, id));
	if (total > 0) return { ok: false, motivo: 'tiene-productos' };

	const filas = await bd.delete(categoria).where(and(eq(categoria.id, id))).returning({ id: categoria.id });
	return filas.length > 0 ? { ok: true } : { ok: false, motivo: 'no-existe' };
}
