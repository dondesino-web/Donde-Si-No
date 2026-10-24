import type { Bd } from './cliente.ts';
import { categoria, negocio, producto, promocion } from './esquema.ts';

/*
 * Datos iniciales extraídos de la ficha de Google del local y de sus afiches (2026-10-22).
 * Pendiente de validación del dueño: precios, horario completo, WhatsApp, redes, condiciones
 * del 2x1, contenido de desayunos y colaciones, y traducciones al inglés.
 */

interface ProductoSemilla {
	nombreEs: string;
	nombreEn?: string;
}

interface CategoriaSemilla {
	slug: string;
	nombreEs: string;
	nombreEn: string;
	productos: readonly ProductoSemilla[];
}

const NEGOCIO_SEMILLA = {
	id: 1,
	nombre: 'Dónde Si No',
	esloganEs: '¡Aquí hay sabor!',
	descripcionEs:
		'Local de comida rápida para comer aquí o llevar. Desayunos, colaciones, churrascos, completos, ' +
		'chorrillanas, fajitas, empanadas, hamburguesas, salchipapas, té, café, jugos, bebidas y mucho más.',
	descripcionEn:
		'Fast food to eat in or take away. Breakfast, set lunches, churrascos, completos, chorrillanas, ' +
		'wraps, empanadas, burgers, salchipapas, tea, coffee, juices, soft drinks and much more.',
	telefono: '+56988860939',
	direccion: 'Ruta G60 Km 3 (Camino a Rapel), Chocalán',
	comuna: 'Melipilla',
	region: 'Región Metropolitana',
	// Google muestra 8320000, que corresponde a Santiago centro, no a Melipilla: queda vacío hasta confirmarlo.
	codigoPostal: null,
	pais: 'CL',
	mapsUrl: 'https://www.google.com/maps/search/?api=1&query=D%C3%B3nde+Si+No+Ruta+G60+Km+3+Chocal%C3%A1n+Melipilla',
	rangoPrecio: '$5.000–10.000',
	servicios: { wifi: true, petFriendly: true, banos: true, paraLlevar: true, consumoLocal: true },
	horario: {},
} satisfies typeof negocio.$inferInsert;

const CATEGORIAS_SEMILLA = [
	{ slug: 'desayunos', nombreEs: 'Desayunos', nombreEn: 'Breakfast', productos: [] },
	{ slug: 'colaciones', nombreEs: 'Colaciones', nombreEn: 'Set lunches', productos: [] },
	{ slug: 'churrascos', nombreEs: 'Churrascos', nombreEn: 'Churrascos', productos: [{ nombreEs: 'Churrasco' }] },
	{
		slug: 'completos',
		nombreEs: 'Completos y as',
		nombreEn: 'Completos & as (Chilean hot dogs)',
		productos: [{ nombreEs: 'Completo' }, { nombreEs: 'As' }],
	},
	{
		slug: 'hamburguesas',
		nombreEs: 'Hamburguesas',
		nombreEn: 'Burgers',
		productos: [{ nombreEs: 'Hamburguesa', nombreEn: 'Burger' }],
	},
	{ slug: 'fajitas', nombreEs: 'Fajitas', nombreEn: 'Wraps', productos: [{ nombreEs: 'Fajita', nombreEn: 'Wrap' }] },
	{
		slug: 'papas',
		nombreEs: 'Papas fritas y más',
		nombreEn: 'Fries & more',
		productos: [{ nombreEs: 'Papas fritas', nombreEn: 'French fries' }, { nombreEs: 'Salchipapas' }, { nombreEs: 'Chorrillana' }],
	},
	{
		slug: 'pollo',
		nombreEs: 'Pollo',
		nombreEn: 'Chicken',
		productos: [{ nombreEs: 'Pollo con papas fritas', nombreEn: 'Chicken with fries' }],
	},
	{ slug: 'empanadas', nombreEs: 'Empanadas', nombreEn: 'Empanadas', productos: [{ nombreEs: 'Empanada' }] },
	{
		slug: 'bebidas',
		nombreEs: 'Bebidas y jugos',
		nombreEn: 'Drinks & juices',
		productos: [
			{ nombreEs: 'Jugo natural', nombreEn: 'Fresh juice' },
			{ nombreEs: 'Té', nombreEn: 'Tea' },
			{ nombreEs: 'Café', nombreEn: 'Coffee' },
			{ nombreEs: 'Bebida', nombreEn: 'Soft drink' },
		],
	},
] as const satisfies readonly CategoriaSemilla[];

// Inactiva hasta que el dueño confirme días, horario y condiciones del 2x1 desde el panel.
const PROMOCIONES_SEMILLA = [
	{ tituloEs: 'Churrascos 2x1', tituloEn: '2-for-1 churrascos', activa: false, orden: 0 },
] satisfies (typeof promocion.$inferInsert)[];

export const DATOS_SEMILLA = {
	negocio: NEGOCIO_SEMILLA,
	categorias: CATEGORIAS_SEMILLA,
	promociones: PROMOCIONES_SEMILLA,
} as const;

/** Carga los datos iniciales solo si la base está vacía (idempotente). */
export async function sembrar(bd: Bd): Promise<{ sembrado: boolean }> {
	const existente = await bd.select({ id: negocio.id }).from(negocio).limit(1);
	if (existente.length > 0) return { sembrado: false };

	await bd.transaction(async (tx) => {
		await tx.insert(negocio).values(DATOS_SEMILLA.negocio);

		for (const [orden, cat] of DATOS_SEMILLA.categorias.entries()) {
			const [fila] = await tx
				.insert(categoria)
				.values({ slug: cat.slug, nombreEs: cat.nombreEs, nombreEn: cat.nombreEn, orden })
				.returning({ id: categoria.id });

			const productos: readonly ProductoSemilla[] = cat.productos;
			if (productos.length === 0) continue;
			await tx.insert(producto).values(
				productos.map((p, i) => ({
					categoriaId: fila.id,
					nombreEs: p.nombreEs,
					nombreEn: p.nombreEn ?? null,
					orden: i,
				})),
			);
		}

		await tx.insert(promocion).values(DATOS_SEMILLA.promociones);
	});

	return { sembrado: true };
}
