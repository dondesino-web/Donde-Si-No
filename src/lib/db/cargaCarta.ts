import { and, eq, isNull, max } from 'drizzle-orm';
import type { Bd } from './cliente.ts';
import { DATOS_CARTA } from './datosCarta.ts';
import { categoria, producto, promocion } from './esquema.ts';

export { DATOS_CARTA };

export interface ResumenCarga {
	/** `false` = solo se calculó lo que pasaría (modo prueba). */
	aplicado: boolean;
	categoriasNuevas: number;
	productosNuevos: number;
	preciosCompletados: number;
	productosRetirados: number;
	promocionesNuevas: number;
	promocionesActualizadas: number;
}

type Tx = Parameters<Parameters<Bd['transaction']>[0]>[0];

/**
 * Carga la carta leída de los carteles. Es segura de repetir y de correr sobre una carta que el dueño ya editó:
 * nunca pisa un precio ni una descripción que ya tengan valor, y solo borra los productos genéricos de la semilla
 * (sin precio, sin foto, sin descripción) que las variantes reemplazan. En modo prueba hace todo y deshace al final.
 */
export async function cargarCarta(bd: Bd, { aplicar }: { aplicar: boolean }): Promise<ResumenCarga> {
	const resumen: ResumenCarga = {
		aplicado: aplicar,
		categoriasNuevas: 0,
		productosNuevos: 0,
		preciosCompletados: 0,
		productosRetirados: 0,
		promocionesNuevas: 0,
		promocionesActualizadas: 0,
	};

	class Deshacer extends Error {}
	try {
		await bd.transaction(async (tx) => {
			for (const cat of DATOS_CARTA.categorias) await cargarCategoria(tx, cat, resumen);
			for (const promo of DATOS_CARTA.promociones) await cargarPromocion(tx, promo, resumen);
			if (!aplicar) throw new Deshacer();
		});
	} catch (error) {
		if (!(error instanceof Deshacer)) throw error;
	}
	return resumen;
}

async function cargarCategoria(tx: Tx, cat: (typeof DATOS_CARTA.categorias)[number], resumen: ResumenCarga): Promise<void> {
	let [fila] = await tx.select({ id: categoria.id }).from(categoria).where(eq(categoria.slug, cat.slug));
	if (!fila) {
		const [ultima] = await tx.select({ orden: max(categoria.orden) }).from(categoria);
		[fila] = await tx
			.insert(categoria)
			.values({ slug: cat.slug, nombreEs: cat.nombreEs, nombreEn: cat.nombreEn, orden: (ultima?.orden ?? -1) + 1 })
			.returning({ id: categoria.id });
		resumen.categoriasNuevas++;
	}
	const categoriaId = fila!.id;

	const existentes = await tx.select().from(producto).where(eq(producto.categoriaId, categoriaId));
	const porNombre = new Map(existentes.map((p) => [p.nombreEs, p]));
	let siguienteOrden = existentes.reduce((mayor, p) => Math.max(mayor, p.orden), -1) + 1;

	for (const datos of cat.productos) {
		const actual = porNombre.get(datos.nombreEs);
		if (!actual) {
			await tx.insert(producto).values({
				categoriaId,
				nombreEs: datos.nombreEs,
				descripcionEs: datos.descripcionEs ?? '',
				precio: datos.precio,
				orden: siguienteOrden++,
			});
			resumen.productosNuevos++;
			continue;
		}
		const cambios: Partial<typeof producto.$inferInsert> = {};
		if (actual.precio === null && datos.precio !== null) cambios.precio = datos.precio;
		if (actual.descripcionEs === '' && datos.descripcionEs) cambios.descripcionEs = datos.descripcionEs;
		if (Object.keys(cambios).length === 0) continue;
		await tx.update(producto).set(cambios).where(eq(producto.id, actual.id));
		if (cambios.precio !== undefined) resumen.preciosCompletados++;
	}

	for (const nombre of cat.retirar ?? []) {
		const borrados = await tx
			.delete(producto)
			.where(and(eq(producto.categoriaId, categoriaId), eq(producto.nombreEs, nombre), isNull(producto.precio), isNull(producto.imagen), eq(producto.descripcionEs, '')))
			.returning({ id: producto.id });
		resumen.productosRetirados += borrados.length;
	}
}

async function cargarPromocion(tx: Tx, datos: (typeof DATOS_CARTA.promociones)[number], resumen: ResumenCarga): Promise<void> {
	const [actual] = await tx.select().from(promocion).where(eq(promocion.tituloEs, datos.tituloEs));
	if (!actual) {
		const [ultima] = await tx.select({ orden: max(promocion.orden) }).from(promocion);
		await tx.insert(promocion).values({ tituloEs: datos.tituloEs, descripcionEs: datos.descripcionEs, precio: datos.precio, activa: true, orden: (ultima?.orden ?? -1) + 1 });
		resumen.promocionesNuevas++;
		return;
	}
	// La semilla dejó «Churrascos 2x1» inactiva y vacía: solo se completa si sigue así, para no pisar lo que haya editado el dueño.
	if (actual.precio !== null || actual.descripcionEs !== '') return;
	await tx.update(promocion).set({ descripcionEs: datos.descripcionEs, precio: datos.precio, activa: true }).where(eq(promocion.id, actual.id));
	resumen.promocionesActualizadas++;
}
