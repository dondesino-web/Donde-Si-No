import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categoria, producto } from '../../src/lib/db/esquema.ts';
import { valoresDeProducto } from '../../src/lib/excel/generar.ts';
import { planificarCambios, type FilaCruda } from '../../src/lib/excel/plan.ts';
import { aplicarPlan } from '../../src/lib/repositorios/adminPlanillaRepo.ts';
import { crearCategoria, crearProducto, listarCartaAdmin } from '../../src/lib/repositorios/adminCartaRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

let prueba: BdPrueba;
let churrascos: number;
let bebidas: number;

const base = { nombreEn: null, descripcionEn: null, alergenos: [], etiquetas: [], disponible: true, destacado: false, visible: true };
const nuevo = (categoriaId: number, nombreEs: string, precio: number | null, descripcionEs = '') => crearProducto(prueba.bd, { ...base, categoriaId, nombreEs, descripcionEs, precio });

/** La planilla tal como se descargaría hoy: una fila por producto, con ID y versión. */
async function planillaActual(): Promise<FilaCruda[]> {
	const carta = await listarCartaAdmin(prueba.bd);
	return carta.flatMap((c) => c.productos.map((p) => ({ fila: 0, celdas: valoresDeProducto(c, p) }))).map((f, i) => ({ ...f, fila: i + 2 }));
}
const aplicar = async (filas: FilaCruda[]) => {
	const plan = planificarCambios(filas, await listarCartaAdmin(prueba.bd));
	expect(plan.errores).toEqual([]);
	return { plan, resultado: await aplicarPlan(prueba.bd, plan) };
};
const productosDe = async (id: number) => (await listarCartaAdmin(prueba.bd)).find((c) => c.id === id)!.productos;
const edita = (filas: FilaCruda[], producto: string, celdas: FilaCruda['celdas']): FilaCruda[] => filas.map((f) => (f.celdas.producto === producto ? { ...f, celdas: { ...f.celdas, ...celdas } } : f));

beforeEach(async () => {
	prueba?.cerrar();
	prueba = await crearBdPrueba();
	churrascos = (await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true })).id;
	bebidas = (await crearCategoria(prueba.bd, { nombreEs: 'Bebidas', nombreEn: null, visible: true })).id;
	await nuevo(churrascos, 'Churrasco', 6500, 'Vacuno');
	await nuevo(churrascos, 'Churrasco pollo', null);
	await nuevo(bebidas, 'Café', 1000);
});
afterAll(() => prueba?.cerrar());

describe('aplicarPlan', () => {
	it('subir la planilla sin tocarla no escribe nada', async () => {
		const antes = await productosDe(churrascos);

		const { plan, resultado } = await aplicar(await planillaActual());

		expect(plan.sinCambios).toBe(3);
		expect(resultado).toEqual({ categoriasCreadas: 0, creados: 0, modificados: 0 });
		expect(await productosDe(churrascos)).toEqual(antes);
	});

	it('modifica precio, nombre, descripción y disponibilidad', async () => {
		const filas = edita(await planillaActual(), 'Churrasco', { producto: 'Churrasco italiano', precio: 7000, descripcion: 'Con palta', disponible: 'No' });

		const { resultado } = await aplicar(filas);

		expect(resultado.modificados).toBe(1);
		const p = (await productosDe(churrascos)).find((x) => x.nombreEs === 'Churrasco italiano')!;
		expect(p).toMatchObject({ precio: 7000, descripcionEs: 'Con palta', disponible: false, visible: true });
	});

	it('un precio vacío deja el producto en «Consultar»', async () => {
		await aplicar(edita(await planillaActual(), 'Churrasco', { precio: null }));

		expect((await productosDe(churrascos)).find((x) => x.nombreEs === 'Churrasco')?.precio).toBeNull();
	});

	it('actualiza la fecha de modificación solo de los productos que cambian', async () => {
		const antes = new Map((await productosDe(churrascos)).map((p) => [p.nombreEs, p.actualizadoEn.getTime()]));
		await prueba.bd.update(producto).set({ actualizadoEn: new Date('2026-01-01T00:00:00Z') });

		await aplicar(edita(await planillaActual(), 'Churrasco', { precio: 7000 }));

		const despues = new Map((await productosDe(churrascos)).map((p) => [p.nombreEs, p.actualizadoEn.getTime()]));
		expect(despues.get('Churrasco')).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());
		expect(despues.get('Churrasco pollo')).toBe(new Date('2026-01-01T00:00:00Z').getTime());
		expect(antes.size).toBe(2);
	});

	it('crea productos nuevos con sus valores por defecto', async () => {
		const filas = [...(await planillaActual()), { fila: 9, celdas: { categoria: 'Bebidas', producto: 'Té', precio: 1200 } }];

		const { resultado } = await aplicar(filas);

		expect(resultado.creados).toBe(1);
		expect((await productosDe(bebidas)).find((p) => p.nombreEs === 'Té')).toMatchObject({ precio: 1200, disponible: true, visible: true, destacado: false, descripcionEs: '' });
	});

	it('crea las categorías que no existían, una sola vez, y deja sus productos dentro', async () => {
		const filas = [
			...(await planillaActual()),
			{ fila: 9, celdas: { categoria: 'Almuerzos', producto: 'Costillar', precio: 8000 } },
			{ fila: 10, celdas: { categoria: 'almuerzos', producto: 'Pollo asado', precio: 6000 } },
		];

		const { resultado } = await aplicar(filas);

		expect(resultado).toMatchObject({ categoriasCreadas: 1, creados: 2 });
		const carta = await listarCartaAdmin(prueba.bd);
		const almuerzos = carta.find((c) => c.nombreEs === 'Almuerzos')!;
		expect(almuerzos).toMatchObject({ visible: true, orden: 2, slug: 'almuerzos' });
		expect(almuerzos.productos.map((p) => p.nombreEs)).toEqual(['Costillar', 'Pollo asado']);
	});

	it('mueve un producto a otra categoría', async () => {
		await aplicar(edita(await planillaActual(), 'Churrasco pollo', { categoria: 'Bebidas' }));

		expect((await productosDe(churrascos)).map((p) => p.nombreEs)).toEqual(['Churrasco']);
		expect((await productosDe(bebidas)).map((p) => p.nombreEs).sort()).toEqual(['Café', 'Churrasco pollo']);
	});

	it('el orden de las filas pasa a ser el orden de la categoría, y lo que no está en la planilla queda al final', async () => {
		const todas = await planillaActual();
		const soloDosInvertidos = [todas.find((f) => f.celdas.producto === 'Churrasco pollo')!, todas.find((f) => f.celdas.producto === 'Café')!];
		await nuevo(churrascos, 'Otro churrasco', null);

		await aplicar(soloDosInvertidos);

		expect((await productosDe(churrascos)).sort((a, b) => a.orden - b.orden).map((p) => p.nombreEs)).toEqual(['Churrasco pollo', 'Churrasco', 'Otro churrasco']);
		const ordenes = (await productosDe(churrascos)).map((p) => p.orden).sort();
		expect(ordenes).toEqual([0, 1, 2]);
	});

	it('los productos nuevos quedan en la posición que tienen en la planilla', async () => {
		const todas = await planillaActual();
		const filas = [todas[0]!, { fila: 9, celdas: { categoria: 'Churrascos', producto: 'Entre medio' } }, todas[1]!];

		await aplicar(filas);

		expect((await productosDe(churrascos)).sort((a, b) => a.orden - b.orden).map((p) => p.nombreEs)).toEqual(['Churrasco', 'Entre medio', 'Churrasco pollo']);
	});

	it('nunca borra: un producto que no está en la planilla sigue en la carta', async () => {
		const sinCafe = (await planillaActual()).filter((f) => f.celdas.producto !== 'Café');

		const { plan } = await aplicar(sinCafe);

		expect(plan.noIncluidos).toBe(1);
		expect(await productosDe(bebidas)).toHaveLength(1);
	});

	it('conserva lo que la planilla no maneja: foto, alérgenos y etiquetas', async () => {
		await prueba.bd.update(producto).set({ alergenos: ['gluten'], etiquetas: ['picante'], imagen: { sm: 'https://x/sm.webp', lg: 'https://x/lg.webp', ancho: 10, alto: 10, altEs: 'a' } }).where(eq(producto.nombreEs, 'Churrasco'));

		await aplicar(edita(await planillaActual(), 'Churrasco', { precio: 9000 }));

		const p = (await productosDe(churrascos)).find((x) => x.nombreEs === 'Churrasco')!;
		expect(p).toMatchObject({ precio: 9000, alergenos: ['gluten'], etiquetas: ['picante'] });
		expect(p.imagen?.lg).toBe('https://x/lg.webp');
	});

	it('un producto que cambió en el panel después de descargar no se pisa', async () => {
		const descargada = await planillaActual();
		await prueba.bd.update(producto).set({ precio: 5555, actualizadoEn: new Date(Date.now() + 120_000) }).where(eq(producto.nombreEs, 'Churrasco'));

		const { plan } = await aplicar(edita(descargada, 'Churrasco', { precio: 7000 }));

		expect(plan.conflictos).toHaveLength(1);
		expect((await productosDe(churrascos)).find((x) => x.nombreEs === 'Churrasco')?.precio).toBe(5555);
	});

	it('es idempotente: aplicar dos veces la misma planilla deja lo mismo', async () => {
		const filas = [...edita(await planillaActual(), 'Churrasco', { precio: 7000 }), { fila: 9, celdas: { categoria: 'Almuerzos', producto: 'Costillar', precio: 8000 } }];
		await aplicar(filas);
		const despuesDeUna = await listarCartaAdmin(prueba.bd);

		const segunda = planificarCambios(filas, despuesDeUna);

		// Las filas que traen el ID y la versión viejos chocan con el cambio ya hecho: no se aplica nada dos veces.
		expect(segunda.nuevos).toEqual([]);
		expect((await prueba.bd.select().from(categoria)).filter((c) => c.nombreEs === 'Almuerzos')).toHaveLength(1);
	});
});
