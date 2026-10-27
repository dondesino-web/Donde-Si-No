import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categoria, estadisticaDiaria, negocio, producto } from '../../src/lib/db/esquema.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const NEGOCIO_MINIMO = {
	nombre: 'Dónde Si No',
	direccion: 'Ruta G60 Km 3',
	comuna: 'Melipilla',
	region: 'Región Metropolitana',
	servicios: { wifi: true, petFriendly: true, banos: true, paraLlevar: true, consumoLocal: true },
};

describe('esquema de la base de datos', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => {
		prueba.cerrar();
		vi.useRealTimers();
	});

	it('crea todas las tablas del modelo de datos', async () => {
		const filas = await prueba.bd.all<{ name: string }>(
			sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name`,
		);
		const tablas = filas.map((f) => f.name).filter((nombre) => !nombre.startsWith('__drizzle'));

		expect(tablas).toEqual([
			'atributo',
			'categoria',
			'estadistica_diaria',
			'foto_destacada',
			'intento_login',
			'menu_dia',
			'negocio',
			'producto',
			'promocion',
		]);
	});

	it('aplica valores por defecto a un producto nuevo', async () => {
		const [cat] = await prueba.bd
			.insert(categoria)
			.values({ slug: 'churrascos', nombreEs: 'Churrascos' })
			.returning();
		const [nuevo] = await prueba.bd
			.insert(producto)
			.values({ categoriaId: cat.id, nombreEs: 'Churrasco' })
			.returning();

		expect(nuevo).toMatchObject({
			precio: null,
			imagen: null,
			alergenos: [],
			etiquetas: [],
			disponible: true,
			destacado: false,
			visible: true,
			descripcionEs: '',
		});
		expect(nuevo.actualizadoEn).toBeInstanceOf(Date);
	});

	it('rechaza un producto con una categoría inexistente', async () => {
		await expect(
			prueba.bd.insert(producto).values({ categoriaId: 999, nombreEs: 'Huérfano' }),
		).rejects.toThrow();
	});

	it('impide borrar una categoría que todavía tiene productos', async () => {
		const [cat] = await prueba.bd
			.insert(categoria)
			.values({ slug: 'empanadas', nombreEs: 'Empanadas' })
			.returning();
		await prueba.bd.insert(producto).values({ categoriaId: cat.id, nombreEs: 'Empanada' });

		await expect(prueba.bd.delete(categoria).where(sql`${categoria.id} = ${cat.id}`)).rejects.toThrow();
	});

	it('no permite dos categorías con el mismo slug', async () => {
		await prueba.bd.insert(categoria).values({ slug: 'pollo', nombreEs: 'Pollo' });

		await expect(
			prueba.bd.insert(categoria).values({ slug: 'pollo', nombreEs: 'Pollo 2' }),
		).rejects.toThrow();
	});

	it('actualiza la fecha de modificación al editar un producto', async () => {
		const [cat] = await prueba.bd.insert(categoria).values({ slug: 'pollo', nombreEs: 'Pollo' }).returning();
		const [creado] = await prueba.bd
			.insert(producto)
			.values({ categoriaId: cat.id, nombreEs: 'Pollo con papas fritas' })
			.returning();
		const despues = new Date('2030-01-15T12:00:00Z');
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(despues);

		const [editado] = await prueba.bd
			.update(producto)
			.set({ precio: 6500 })
			.where(eq(producto.id, creado.id))
			.returning();

		expect(editado.actualizadoEn).toEqual(despues);
		expect(editado.actualizadoEn.getTime()).toBeGreaterThan(creado.actualizadoEn.getTime());
	});

	it('rechaza precios negativos', async () => {
		const [cat] = await prueba.bd.insert(categoria).values({ slug: 'pollo', nombreEs: 'Pollo' }).returning();

		await expect(
			prueba.bd.insert(producto).values({ categoriaId: cat.id, nombreEs: 'Pollo', precio: -1 }),
		).rejects.toThrow();
	});

	it('permite una sola fila de datos del local', async () => {
		await prueba.bd.insert(negocio).values({ id: 1, ...NEGOCIO_MINIMO });

		await expect(prueba.bd.insert(negocio).values({ id: 2, ...NEGOCIO_MINIMO })).rejects.toThrow();
	});

	it('solo acepta eventos de estadística conocidos', async () => {
		await prueba.bd.insert(estadisticaDiaria).values({ fecha: '2026-10-22', evento: 'visita', conteo: 1 });

		await expect(
			// @ts-expect-error TypeScript ya lo impide; se prueba que la base también lo rechace (p. ej. datos del beacon).
			prueba.bd.insert(estadisticaDiaria).values({ fecha: '2026-10-22', evento: 'evento-inventado', conteo: 1 }),
		).rejects.toThrow();
	});
});
