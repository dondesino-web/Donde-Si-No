import { and, asc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { atributo, categoria, fotoDestacada, menuDia, negocio, producto, promocion } from '../db/esquema.ts';
import { fechaLocalISO } from '../dominio/horario.ts';

export type Negocio = typeof negocio.$inferSelect;
export type Producto = typeof producto.$inferSelect;
export type Categoria = typeof categoria.$inferSelect;
export type Promocion = typeof promocion.$inferSelect;
export type MenuDia = typeof menuDia.$inferSelect;
export type FotoDestacada = typeof fotoDestacada.$inferSelect;
export type Atributo = typeof atributo.$inferSelect;

export interface CategoriaConProductos extends Categoria {
	productos: Producto[];
}

export interface CartaPublica {
	negocio: Negocio;
	/** Solo categorías visibles y con al menos un producto visible. */
	categorias: CategoriaConProductos[];
	/** Promociones activas y vigentes hoy (hora de Chile). */
	promociones: Promocion[];
	menuDia: MenuDia | null;
	fotos: FotoDestacada[];
	/** Catálogo de alérgenos y etiquetas: traduce las claves que guarda cada producto a su nombre. */
	atributos: Atributo[];
}

/** Agrupa los productos por categoría conservando el orden de ambas listas y descartando categorías vacías. */
export function agruparPorCategoria(categorias: Categoria[], productos: Producto[]): CategoriaConProductos[] {
	return categorias
		.map((c) => ({ ...c, productos: productos.filter((p) => p.categoriaId === c.id) }))
		.filter((c) => c.productos.length > 0);
}

/** Defensa en profundidad: lo que va a un `href` público debe ser https, venga de donde venga (semilla, panel o un script). */
const soloHttps = (url: string | null): string | null => (url !== null && /^https:\/\//i.test(url) ? url : null);

function conEnlacesSeguros(negocio: Negocio): Negocio {
	return {
		...negocio,
		mapsUrl: soloHttps(negocio.mapsUrl),
		resenaUrl: soloHttps(negocio.resenaUrl),
		instagramUrl: soloHttps(negocio.instagramUrl),
		facebookUrl: soloHttps(negocio.facebookUrl),
		ubereatsUrl: soloHttps(negocio.ubereatsUrl),
	};
}

/** Lee todo lo que la carta pública necesita. Lanza si el local aún no fue sembrado. */
export async function obtenerCartaPublica(bd: Bd, ahora: Date = new Date()): Promise<CartaPublica> {
	const hoy = fechaLocalISO(ahora);

	const [fila, categorias, productos, promociones, menus, fotos, atributos] = await Promise.all([
		bd.select().from(negocio).where(eq(negocio.id, 1)).get(),
		bd.select().from(categoria).where(eq(categoria.visible, true)).orderBy(asc(categoria.orden), asc(categoria.id)),
		bd.select().from(producto).where(eq(producto.visible, true)).orderBy(asc(producto.orden), asc(producto.id)),
		bd
			.select()
			.from(promocion)
			.where(
				and(
					eq(promocion.activa, true),
					or(isNull(promocion.desde), lte(promocion.desde, hoy)),
					or(isNull(promocion.hasta), gte(promocion.hasta, hoy)),
				),
			)
			.orderBy(asc(promocion.orden), asc(promocion.id)),
		bd
			.select()
			.from(menuDia)
			.where(and(eq(menuDia.activo, true), or(isNull(menuDia.fecha), eq(menuDia.fecha, hoy))))
			.orderBy(asc(menuDia.id)),
		bd.select().from(fotoDestacada).orderBy(asc(fotoDestacada.orden), asc(fotoDestacada.id)),
		bd.select().from(atributo).orderBy(asc(atributo.orden), asc(atributo.id)),
	]);

	if (!fila) throw new Error('No hay datos del local: falta ejecutar la semilla (npm run db:seed).');

	return {
		negocio: conEnlacesSeguros(fila),
		categorias: agruparPorCategoria(categorias, productos),
		promociones,
		menuDia: menus[0] ?? null,
		fotos,
		atributos,
	};
}
