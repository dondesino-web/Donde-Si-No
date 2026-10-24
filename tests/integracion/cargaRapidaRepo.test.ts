import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categoria, producto } from '../../src/lib/db/esquema.ts';
import { crearCategoria, crearProducto, crearProductosEnLote, type DatosProducto } from '../../src/lib/repositorios/adminCartaRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

let prueba: BdPrueba;
let categoriaId: number;

const base: Omit<DatosProducto, 'categoriaId' | 'nombreEs' | 'descripcionEs' | 'precio'> = { nombreEn: null, descripcionEn: null, alergenos: [], etiquetas: [], disponible: true, destacado: false, visible: true };
const productosDe = (id: number) => prueba.bd.select().from(producto).where(eq(producto.categoriaId, id));

beforeEach(async () => {
	prueba?.cerrar();
	prueba = await crearBdPrueba();
	categoriaId = (await crearCategoria(prueba.bd, { nombreEs: 'Almuerzos', nombreEn: null, visible: true })).id;
});
afterAll(() => prueba?.cerrar());

describe('crearProductosEnLote', () => {
	it('crea todos los productos con su precio y descripción, visibles y disponibles', async () => {
		const resultado = await crearProductosEnLote(prueba.bd, categoriaId, [
			{ nombreEs: 'Costillar', precio: 8000, descripcionEs: 'Con puré' },
			{ nombreEs: 'Lasagna', precio: null, descripcionEs: '' },
		]);

		expect(resultado).toEqual({ creados: 2, yaExistian: [] });
		const guardados = await productosDe(categoriaId);
		expect(guardados.map((p) => [p.nombreEs, p.precio, p.descripcionEs])).toEqual([
			['Costillar', 8000, 'Con puré'],
			['Lasagna', null, ''],
		]);
		expect(guardados.every((p) => p.visible && p.disponible && !p.destacado)).toBe(true);
	});

	it('los pone al final de la categoría, en el orden en que se escribieron', async () => {
		await crearProducto(prueba.bd, { ...base, categoriaId, nombreEs: 'Primero', descripcionEs: '', precio: null });

		await crearProductosEnLote(prueba.bd, categoriaId, [
			{ nombreEs: 'Segundo', precio: null, descripcionEs: '' },
			{ nombreEs: 'Tercero', precio: null, descripcionEs: '' },
		]);

		const nombres = (await productosDe(categoriaId)).sort((a, b) => a.orden - b.orden).map((p) => p.nombreEs);
		expect(nombres).toEqual(['Primero', 'Segundo', 'Tercero']);
	});

	it('no duplica ni modifica un producto que ya existe (mismo nombre, sin distinguir tildes ni mayúsculas)', async () => {
		await crearProducto(prueba.bd, { ...base, categoriaId, nombreEs: 'Café', descripcionEs: 'El del dueño', precio: 1500 });

		const resultado = await crearProductosEnLote(prueba.bd, categoriaId, [
			{ nombreEs: 'CAFE', precio: 1000, descripcionEs: '' },
			{ nombreEs: 'Té', precio: 1000, descripcionEs: '' },
		]);

		expect(resultado).toEqual({ creados: 1, yaExistian: ['CAFE'] });
		const cafe = (await productosDe(categoriaId)).find((p) => p.nombreEs === 'Café');
		expect(cafe).toMatchObject({ precio: 1500, descripcionEs: 'El del dueño' });
	});

	it('permite el mismo nombre en otra categoría', async () => {
		const otra = (await crearCategoria(prueba.bd, { nombreEs: 'Bebidas', nombreEn: null, visible: true })).id;
		await crearProducto(prueba.bd, { ...base, categoriaId: otra, nombreEs: 'Café', descripcionEs: '', precio: null });

		const resultado = await crearProductosEnLote(prueba.bd, categoriaId, [{ nombreEs: 'Café', precio: 1000, descripcionEs: '' }]);

		expect(resultado).toEqual({ creados: 1, yaExistian: [] });
	});

	it('devuelve undefined si la categoría ya no existe y no crea nada', async () => {
		const resultado = await crearProductosEnLote(prueba.bd, 9999, [{ nombreEs: 'Té', precio: null, descripcionEs: '' }]);

		expect(resultado).toBeUndefined();
		expect(await prueba.bd.select().from(producto)).toHaveLength(0);
		expect(await prueba.bd.select().from(categoria)).toHaveLength(1);
	});
});
