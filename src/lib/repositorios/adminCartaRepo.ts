import { asc, count, eq, like, max } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { categoria, producto } from '../db/esquema.ts';
import { slugificar } from '../dominio/slug.ts';
import type { Imagen } from '../dominio/tipos.ts';
import type { DatosCategoriaFormulario, DatosProductoFormulario } from '../validacion/carta.ts';
import { claveDeNombre, type ProductoRapido } from '../validacion/cargaRapida.ts';
import type { Categoria, CategoriaConProductos, Producto } from './cartaRepo.ts';

// Lo único que necesitan los actualizadores; sirve tanto para la conexión como para una transacción.
type Ejecutor = Pick<Bd, 'update'>;

export type Direccion = 'arriba' | 'abajo';

/** Lo que se guarda de un producto: lo que valida el formulario, más la foto (`undefined` = conservar; `null` = quitarla). */
export type DatosProducto = DatosProductoFormulario & { imagen?: Imagen | null };

export type DatosCategoria = DatosCategoriaFormulario;

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

export interface ResultadoLote {
	creados: number;
	/** Nombres (como se escribieron) que ya estaban en la categoría: no se tocan ni se duplican. */
	yaExistian: string[];
}

/**
 * Crea varios productos de una vez al final de una categoría, en una sola transacción. Un nombre que ya existe en esa
 * categoría (sin distinguir mayúsculas, tildes ni espacios de más) se omite: nunca se pisa lo que ya editó el dueño.
 * Devuelve `undefined` si la categoría no existe.
 */
export async function crearProductosEnLote(bd: Bd, categoriaId: number, nuevos: readonly ProductoRapido[]): Promise<ResultadoLote | undefined> {
	return bd.transaction(async (tx) => {
		const [existe] = await tx.select({ id: categoria.id }).from(categoria).where(eq(categoria.id, categoriaId));
		if (!existe) return undefined;

		const actuales = await tx.select({ nombreEs: producto.nombreEs, orden: producto.orden }).from(producto).where(eq(producto.categoriaId, categoriaId));
		const nombres = new Set(actuales.map((p) => claveDeNombre(p.nombreEs)));
		let orden = actuales.reduce((mayor, p) => Math.max(mayor, p.orden), -1) + 1;
		const yaExistian: string[] = [];
		const porCrear: (typeof producto.$inferInsert)[] = [];

		for (const datos of nuevos) {
			if (nombres.has(claveDeNombre(datos.nombreEs))) {
				yaExistian.push(datos.nombreEs);
				continue;
			}
			porCrear.push({ categoriaId, nombreEs: datos.nombreEs, descripcionEs: datos.descripcionEs, precio: datos.precio, orden: orden++ });
		}
		if (porCrear.length > 0) await tx.insert(producto).values(porCrear);
		return { creados: porCrear.length, yaExistian };
	});
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
export async function moverEnGrupo(bd: Bd, ids: { orden: number; id: number }[], id: number, direccion: Direccion, actualizar: (ejecutor: Ejecutor, id: number, orden: number) => Promise<unknown>): Promise<boolean> {
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

async function slugDisponible(bd: Pick<Bd, 'select'>, nombre: string): Promise<string> {
	const base = slugificar(nombre);
	const usados = new Set((await bd.select({ slug: categoria.slug }).from(categoria).where(like(categoria.slug, `${base}%`))).map((f) => f.slug));
	if (!usados.has(base)) return base;

	for (let n = 2; ; n++) {
		if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
	}
}

/** Acepta la conexión o una transacción. */
export async function crearCategoria(bd: Pick<Bd, 'select' | 'insert'>, datos: DatosCategoria): Promise<Categoria> {
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

	const filas = await bd.delete(categoria).where(eq(categoria.id, id)).returning({ id: categoria.id });
	return filas.length > 0 ? { ok: true } : { ok: false, motivo: 'no-existe' };
}
