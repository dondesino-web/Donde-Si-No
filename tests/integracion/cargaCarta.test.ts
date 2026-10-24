import { and, eq, isNull } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cargarCarta, DATOS_CARTA } from '../../src/lib/db/cargaCarta.ts';
import { categoria, producto, promocion } from '../../src/lib/db/esquema.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

let prueba: BdPrueba;

const productosDe = async (slug: string) => {
	const { bd } = prueba;
	const [cat] = await bd.select().from(categoria).where(eq(categoria.slug, slug));
	return bd.select().from(producto).where(eq(producto.categoriaId, cat.id));
};

beforeEach(async () => {
	prueba?.cerrar();
	prueba = await crearBdPrueba();
	await sembrar(prueba.bd);
});
afterAll(() => prueba?.cerrar());

describe('datos de la carta', () => {
	it('no repite nombres de producto dentro de una categoría', () => {
		for (const cat of DATOS_CARTA.categorias) {
			const nombres = cat.productos.map((p) => p.nombreEs);
			expect(new Set(nombres).size, cat.slug).toBe(nombres.length);
		}
	});

	it('usa precios enteros y positivos, o null para «Consultar»', () => {
		const precios = [...DATOS_CARTA.categorias.flatMap((c) => c.productos), ...DATOS_CARTA.promociones].map((p) => p.precio);
		for (const precio of precios) expect(precio === null || (Number.isInteger(precio) && precio > 0)).toBe(true);
	});
});

describe('cargarCarta', () => {
	it('en modo prueba cuenta lo que haría y no escribe nada', async () => {
		const antes = await prueba.bd.select().from(producto);

		const resumen = await cargarCarta(prueba.bd, { aplicar: false });

		expect(resumen.aplicado).toBe(false);
		expect(resumen.productosNuevos).toBeGreaterThan(30);
		expect(await prueba.bd.select().from(producto)).toHaveLength(antes.length);
	});

	it('crea los productos con su precio, y deja en «Consultar» los que no se leen', async () => {
		await cargarCarta(prueba.bd, { aplicar: true });

		const completos = await productosDe('completos');
		expect(completos.find((p) => p.nombreEs === 'Completo grande')?.precio).toBe(2500);
		expect(completos.find((p) => p.nombreEs === 'As chico')?.precio).toBe(3500);
		const churrascos = await productosDe('churrascos');
		expect(churrascos.find((p) => p.nombreEs === 'Churrasco')?.precio).toBeNull();
		const almuerzos = await productosDe('almuerzos');
		expect(almuerzos.find((p) => p.nombreEs === 'Costillar')?.precio).toBe(8000);
		expect(almuerzos.find((p) => p.nombreEs === 'Lasagna')?.precio).toBeNull();
	});

	it('retira los productos genéricos de la semilla que las variantes reemplazan', async () => {
		await cargarCarta(prueba.bd, { aplicar: true });

		const nombres = (await productosDe('completos')).map((p) => p.nombreEs);
		expect(nombres).not.toContain('Completo');
		expect(nombres).toContain('Completo grande');
	});

	it('no retira un producto genérico que el dueño ya editó (con precio)', async () => {
		const { bd } = prueba;
		await bd.update(producto).set({ precio: 2700 }).where(eq(producto.nombreEs, 'Completo'));

		await cargarCarta(bd, { aplicar: true });

		const completo = (await productosDe('completos')).find((p) => p.nombreEs === 'Completo');
		expect(completo?.precio).toBe(2700);
	});

	it('no pisa un precio que el dueño ya cargó', async () => {
		const { bd } = prueba;
		await cargarCarta(bd, { aplicar: true });
		await bd.update(producto).set({ precio: 9999 }).where(eq(producto.nombreEs, 'Costillar'));

		await cargarCarta(bd, { aplicar: true });

		const costillar = (await productosDe('almuerzos')).find((p) => p.nombreEs === 'Costillar');
		expect(costillar?.precio).toBe(9999);
	});

	it('completa un precio que seguía en «Consultar»', async () => {
		const { bd } = prueba;
		await cargarCarta(bd, { aplicar: true });
		await bd.update(producto).set({ precio: null }).where(eq(producto.nombreEs, 'Costillar'));

		await cargarCarta(bd, { aplicar: true });

		const costillar = (await productosDe('almuerzos')).find((p) => p.nombreEs === 'Costillar');
		expect(costillar?.precio).toBe(8000);
	});

	it('es idempotente: cargarla dos veces no duplica nada', async () => {
		const { bd } = prueba;
		await cargarCarta(bd, { aplicar: true });
		const productos = (await bd.select().from(producto)).length;
		const promos = (await bd.select().from(promocion)).length;

		const segunda = await cargarCarta(bd, { aplicar: true });

		expect(segunda.productosNuevos).toBe(0);
		expect(segunda.promocionesNuevas).toBe(0);
		expect((await bd.select().from(producto)).length).toBe(productos);
		expect((await bd.select().from(promocion)).length).toBe(promos);
	});

	it('actualiza la promoción 2x1 de la semilla en vez de duplicarla', async () => {
		const { bd } = prueba;

		await cargarCarta(bd, { aplicar: true });

		const dosPorUno = await bd.select().from(promocion).where(eq(promocion.tituloEs, 'Churrascos 2x1'));
		expect(dosPorUno).toHaveLength(1);
		expect(dosPorUno[0]?.precio).toBe(6900);
		expect(dosPorUno[0]?.activa).toBe(true);
	});

	it('carga los combos como promociones activas', async () => {
		const { bd } = prueba;

		await cargarCarta(bd, { aplicar: true });

		const combo = (await bd.select().from(promocion).where(eq(promocion.tituloEs, 'Combo para 2')))[0];
		expect(combo?.precio).toBe(11500);
		expect(combo?.activa).toBe(true);
		const sinPrecio = await bd.select().from(promocion).where(and(isNull(promocion.precio), eq(promocion.activa, true)));
		expect(sinPrecio).toHaveLength(0);
	});

	it('ordena los productos nuevos después de los que ya había', async () => {
		const { bd } = prueba;

		await cargarCarta(bd, { aplicar: true });

		const ordenes = (await productosDe('almuerzos')).map((p) => p.orden);
		expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
		expect(new Set(ordenes).size).toBe(ordenes.length);
	});
});
