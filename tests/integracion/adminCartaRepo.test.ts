import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	actualizarProducto,
	cambiarPrecio,
	crearCategoria,
	crearProducto,
	eliminarCategoria,
	eliminarProducto,
	establecerDisponible,
	listarCartaAdmin,
	moverCategoria,
	moverProducto,
	obtenerProducto,
	type DatosProducto,
} from '../../src/lib/repositorios/adminCartaRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const producto = (cambios: Partial<DatosProducto> & { categoriaId: number }): DatosProducto => ({
	nombreEs: 'Churrasco',
	nombreEn: null,
	descripcionEs: '',
	descripcionEn: null,
	precio: 4500,
	alergenos: [],
	etiquetas: [],
	disponible: true,
	destacado: false,
	visible: true,
	...cambios,
});

describe('repositorio de administración de la carta', () => {
	let prueba: BdPrueba;
	let categoriaId: number;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
		categoriaId = (await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true })).id;
	});

	afterEach(() => prueba.cerrar());

	const nombres = async (idCategoria = categoriaId) => {
		const carta = await listarCartaAdmin(prueba.bd);
		return carta.find((c) => c.id === idCategoria)?.productos.map((p) => p.nombreEs);
	};

	describe('productos', () => {
		it('crea productos con orden consecutivo dentro de su categoría', async () => {
			const a = await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'A' }));
			const b = await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'B' }));

			expect([a.orden, b.orden]).toEqual([0, 1]);
			expect(await nombres()).toEqual(['A', 'B']);
		});

		it('la lista de administración incluye ocultos y categorías vacías', async () => {
			await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'Oculto', visible: false }));
			const vacia = await crearCategoria(prueba.bd, { nombreEs: 'Vacía', nombreEn: null, visible: false });

			const carta = await listarCartaAdmin(prueba.bd);

			expect(carta.map((c) => c.id)).toEqual([categoriaId, vacia.id]);
			expect(carta[0].productos[0].visible).toBe(false);
			expect(carta[1].productos).toEqual([]);
		});

		it('actualiza los datos y renueva la fecha de modificación', async () => {
			const original = await crearProducto(prueba.bd, producto({ categoriaId }));

			const actualizado = await actualizarProducto(
				prueba.bd,
				original.id,
				producto({ categoriaId, nombreEs: 'Churrasco italiano', precio: null, alergenos: ['gluten'], disponible: false }),
			);

			expect(actualizado).toBe(true);
			const guardado = await obtenerProducto(prueba.bd, original.id);
			expect(guardado).toMatchObject({ nombreEs: 'Churrasco italiano', precio: null, alergenos: ['gluten'], disponible: false });
			expect(guardado!.actualizadoEn.getTime()).toBeGreaterThanOrEqual(original.actualizadoEn.getTime());
		});

		it('informa cuando el producto no existe', async () => {
			expect(await actualizarProducto(prueba.bd, 999, producto({ categoriaId }))).toBe(false);
			expect(await cambiarPrecio(prueba.bd, 999, 100)).toBe(false);
			expect(await establecerDisponible(prueba.bd, 999, false)).toBe(false);
			expect(await eliminarProducto(prueba.bd, 999)).toBe(false);
		});

		it('cambia solo el precio, y permite dejarlo en «Consultar»', async () => {
			const { id } = await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'Solo precio' }));

			await cambiarPrecio(prueba.bd, id, 5200);
			expect(await obtenerProducto(prueba.bd, id)).toMatchObject({ precio: 5200, nombreEs: 'Solo precio' });

			await cambiarPrecio(prueba.bd, id, null);
			expect((await obtenerProducto(prueba.bd, id))!.precio).toBeNull();
		});

		it('marca y desmarca agotado sin tocar nada más', async () => {
			const { id } = await crearProducto(prueba.bd, producto({ categoriaId, precio: 3000 }));

			await establecerDisponible(prueba.bd, id, false);
			expect(await obtenerProducto(prueba.bd, id)).toMatchObject({ disponible: false, precio: 3000 });

			await establecerDisponible(prueba.bd, id, true);
			expect((await obtenerProducto(prueba.bd, id))!.disponible).toBe(true);
		});

		it('mueve hacia arriba y hacia abajo, y no se sale de los extremos', async () => {
			for (const nombre of ['A', 'B', 'C']) await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: nombre }));
			const [a, b, c] = (await listarCartaAdmin(prueba.bd))[0].productos;

			await moverProducto(prueba.bd, c.id, 'arriba');
			expect(await nombres()).toEqual(['A', 'C', 'B']);

			await moverProducto(prueba.bd, a.id, 'abajo');
			expect(await nombres()).toEqual(['C', 'A', 'B']);

			await moverProducto(prueba.bd, c.id, 'arriba');
			await moverProducto(prueba.bd, b.id, 'abajo');
			expect(await nombres()).toEqual(['C', 'A', 'B']);
		});

		it('ordena bien aunque todos tengan el mismo orden (como la semilla)', async () => {
			for (const nombre of ['A', 'B', 'C']) await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: nombre }));
			const { productos } = (await listarCartaAdmin(prueba.bd))[0];
			await prueba.bd.run(sql`update producto set orden = 0`);

			await moverProducto(prueba.bd, productos[2].id, 'arriba');

			expect(await nombres()).toEqual(['A', 'C', 'B']);
		});

		it('elimina un producto', async () => {
			const { id } = await crearProducto(prueba.bd, producto({ categoriaId }));

			expect(await eliminarProducto(prueba.bd, id)).toBe(true);
			expect(await obtenerProducto(prueba.bd, id)).toBeUndefined();
		});
	});

	describe('categorías', () => {
		it('genera un slug único a partir del nombre', async () => {
			const otra = await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true });

			const carta = await listarCartaAdmin(prueba.bd);

			expect(carta.map((c) => c.slug)).toEqual(['churrascos', 'churrascos-2']);
			expect(otra.orden).toBe(1);
		});

		it('mueve categorías', async () => {
			const b = await crearCategoria(prueba.bd, { nombreEs: 'B', nombreEn: null, visible: true });

			await moverCategoria(prueba.bd, b.id, 'arriba');

			expect((await listarCartaAdmin(prueba.bd)).map((c) => c.nombreEs)).toEqual(['B', 'Churrascos']);
		});

		it('no elimina una categoría que todavía tiene productos', async () => {
			await crearProducto(prueba.bd, producto({ categoriaId }));

			expect(await eliminarCategoria(prueba.bd, categoriaId)).toEqual({ ok: false, motivo: 'tiene-productos' });
			expect(await listarCartaAdmin(prueba.bd)).toHaveLength(1);
		});

		it('elimina una categoría vacía', async () => {
			const vacia = await crearCategoria(prueba.bd, { nombreEs: 'Vacía', nombreEn: null, visible: true });

			expect(await eliminarCategoria(prueba.bd, vacia.id)).toEqual({ ok: true });
			expect(await eliminarCategoria(prueba.bd, vacia.id)).toEqual({ ok: false, motivo: 'no-existe' });
		});
	});
});
