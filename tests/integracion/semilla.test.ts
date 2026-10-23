import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { categoria, negocio, producto, promocion } from '../../src/lib/db/esquema.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

describe('semilla inicial', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => {
		prueba.cerrar();
	});

	it('carga los datos del local extraídos de Google y los afiches', async () => {
		const resultado = await sembrar(prueba.bd);

		const filas = await prueba.bd.select().from(negocio);
		expect(resultado).toEqual({ sembrado: true });
		expect(filas).toHaveLength(1);
		expect(filas[0]).toMatchObject({
			nombre: 'Dónde Si No',
			esloganEs: '¡Aquí hay sabor!',
			telefono: '+56988860939',
			comuna: 'Melipilla',
			pais: 'CL',
			servicios: { wifi: true, petFriendly: true, banos: true, paraLlevar: true, consumoLocal: true },
			horario: {},
		});
	});

	it('deja sin código postal el dato dudoso de Google hasta que el dueño lo confirme', async () => {
		await sembrar(prueba.bd);

		const [fila] = await prueba.bd.select().from(negocio);
		expect(fila.codigoPostal).toBeNull();
	});

	it('crea las categorías de los afiches en orden', async () => {
		await sembrar(prueba.bd);

		const filas = await prueba.bd.select().from(categoria).orderBy(categoria.orden);
		expect(filas.map((c) => c.slug)).toEqual([
			'desayunos',
			'colaciones',
			'churrascos',
			'completos',
			'hamburguesas',
			'fajitas',
			'papas',
			'pollo',
			'empanadas',
			'bebidas',
		]);
	});

	it('asocia cada producto a su categoría y los deja sin precio hasta que el dueño lo cargue', async () => {
		await sembrar(prueba.bd);

		const categorias = await prueba.bd.select().from(categoria);
		const productos = await prueba.bd.select().from(producto);
		const slugPorId = new Map(categorias.map((c) => [c.id, c.slug]));

		expect(productos).toHaveLength(14);
		expect(productos.every((p) => slugPorId.has(p.categoriaId))).toBe(true);
		expect(productos.every((p) => p.precio === null)).toBe(true);
		expect(
			productos.filter((p) => slugPorId.get(p.categoriaId) === 'papas').map((p) => p.nombreEs),
		).toEqual(['Papas fritas', 'Salchipapas', 'Chorrillana']);
	});

	it('crea la promoción de churrascos 2x1 inactiva hasta que el dueño confirme sus condiciones', async () => {
		await sembrar(prueba.bd);

		const promos = await prueba.bd.select().from(promocion);
		expect(promos).toHaveLength(1);
		expect(promos[0]).toMatchObject({ tituloEs: 'Churrascos 2x1', activa: false });
	});

	it('no duplica datos si se ejecuta dos veces', async () => {
		await sembrar(prueba.bd);
		const segunda = await sembrar(prueba.bd);

		const categorias = await prueba.bd.select().from(categoria);
		expect(segunda).toEqual({ sembrado: false });
		expect(categorias).toHaveLength(10);
	});

	it('no deja datos a medias si falla en mitad de la carga', async () => {
		// Una categoría con el mismo slug hace fallar la inserción después de crear el negocio.
		await prueba.bd.insert(categoria).values({ slug: 'churrascos', nombreEs: 'Churrascos' });

		await expect(sembrar(prueba.bd)).rejects.toThrow();

		expect(await prueba.bd.select().from(negocio)).toHaveLength(0);
		expect(await prueba.bd.select().from(categoria)).toHaveLength(1);
	});
});
