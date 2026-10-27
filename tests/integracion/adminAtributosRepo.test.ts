import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearCategoria, crearProducto, obtenerProducto, type DatosProducto } from '../../src/lib/repositorios/adminCartaRepo.ts';
import {
	actualizarAtributo,
	crearAtributo,
	eliminarAtributo,
	listarAtributos,
} from '../../src/lib/repositorios/adminAtributosRepo.ts';
import { obtenerCartaPublica } from '../../src/lib/repositorios/cartaRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';

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

describe('catálogo de etiquetas y alérgenos', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	it('la base nace con los alérgenos y etiquetas de siempre', async () => {
		const todos = await listarAtributos(prueba.bd);

		expect(todos.filter((a) => a.tipo === 'alergeno').map((a) => a.clave)).toEqual([
			'gluten',
			'huevo',
			'leche',
			'soya',
			'mani',
			'frutos_secos',
			'pescado',
			'mariscos',
			'sulfitos',
		]);
		expect(todos.filter((a) => a.tipo === 'etiqueta').map((a) => a.nombreEs)).toEqual(['Vegetariano', 'Picante', 'Nuevo']);
	});

	describe('crear', () => {
		it('genera una clave estable a partir del nombre y lo deja al final de su lista', async () => {
			const resultado = await crearAtributo(prueba.bd, { tipo: 'alergeno', nombreEs: 'Apio', nombreEn: 'Celery' });

			expect(resultado).toMatchObject({ ok: true, atributo: { tipo: 'alergeno', clave: 'apio', nombreEs: 'Apio', nombreEn: 'Celery', orden: 9 } });
		});

		it('la clave no lleva tildes ni espacios', async () => {
			const resultado = await crearAtributo(prueba.bd, { tipo: 'etiqueta', nombreEs: 'Sin Gluten ¡Ñam!', nombreEn: null });

			expect(resultado).toMatchObject({ ok: true, atributo: { clave: 'sin_gluten_nam' } });
		});

		it('rechaza un nombre repetido en la misma lista, sin distinguir mayúsculas ni tildes', async () => {
			const repetido = await crearAtributo(prueba.bd, { tipo: 'alergeno', nombreEs: 'MANÍ', nombreEn: null });

			expect(repetido).toEqual({ ok: false, motivo: 'repetido' });
		});

		it('permite el mismo nombre en listas distintas', async () => {
			const resultado = await crearAtributo(prueba.bd, { tipo: 'etiqueta', nombreEs: 'Gluten', nombreEn: null });

			expect(resultado.ok).toBe(true);
		});
	});

	describe('modificar', () => {
		it('cambia el nombre pero conserva la clave, así los productos siguen enlazados', async () => {
			const [fila] = (await listarAtributos(prueba.bd)).filter((a) => a.clave === 'picante');

			const resultado = await actualizarAtributo(prueba.bd, fila.id, { nombreEs: 'Muy picante', nombreEn: 'Very spicy' });

			expect(resultado).toMatchObject({ ok: true, atributo: { clave: 'picante', nombreEs: 'Muy picante', nombreEn: 'Very spicy' } });
		});

		it('informa si ya no existe', async () => {
			expect(await actualizarAtributo(prueba.bd, 9999, { nombreEs: 'X', nombreEn: null })).toEqual({ ok: false, motivo: 'no-existe' });
		});

		it('rechaza el nombre de otro de la misma lista, pero permite volver a guardar el suyo', async () => {
			const todos = await listarAtributos(prueba.bd);
			const huevo = todos.find((a) => a.clave === 'huevo')!;

			expect(await actualizarAtributo(prueba.bd, huevo.id, { nombreEs: 'Leche', nombreEn: null })).toEqual({ ok: false, motivo: 'repetido' });
			expect((await actualizarAtributo(prueba.bd, huevo.id, { nombreEs: 'Huevo', nombreEn: null })).ok).toBe(true);
		});
	});

	describe('eliminar', () => {
		it('lo quita del catálogo y de todos los productos que lo llevaban', async () => {
			const categoriaId = (await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true })).id;
			const a = await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'A', alergenos: ['gluten', 'huevo'], etiquetas: ['picante'] }));
			const b = await crearProducto(prueba.bd, producto({ categoriaId, nombreEs: 'B', alergenos: ['leche'] }));
			const gluten = (await listarAtributos(prueba.bd)).find((x) => x.clave === 'gluten')!;

			const resultado = await eliminarAtributo(prueba.bd, gluten.id);

			expect(resultado).toEqual({ ok: true, productos: 1 });
			expect((await obtenerProducto(prueba.bd, a.id))?.alergenos).toEqual(['huevo']);
			expect((await obtenerProducto(prueba.bd, b.id))?.alergenos).toEqual(['leche']);
			expect((await listarAtributos(prueba.bd)).some((x) => x.clave === 'gluten')).toBe(false);
		});

		it('no toca la etiqueta que se llama igual que un alérgeno', async () => {
			const categoriaId = (await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true })).id;
			const etiqueta = await crearAtributo(prueba.bd, { tipo: 'etiqueta', nombreEs: 'Gluten', nombreEn: null });
			if (!etiqueta.ok) throw new Error('no se creó');
			const p = await crearProducto(prueba.bd, producto({ categoriaId, alergenos: ['gluten'], etiquetas: ['gluten'] }));
			const alergeno = (await listarAtributos(prueba.bd)).find((x) => x.tipo === 'alergeno' && x.clave === 'gluten')!;

			await eliminarAtributo(prueba.bd, alergeno.id);

			const guardado = await obtenerProducto(prueba.bd, p.id);
			expect(guardado?.alergenos).toEqual([]);
			expect(guardado?.etiquetas).toEqual(['gluten']);
		});

		it('informa si ya no existe', async () => {
			expect(await eliminarAtributo(prueba.bd, 9999)).toEqual({ ok: false, motivo: 'no-existe' });
		});
	});

	describe('carta pública', () => {
		it('incluye el catálogo para poder mostrar los nombres', async () => {
			await sembrar(prueba.bd);
			await crearAtributo(prueba.bd, { tipo: 'etiqueta', nombreEs: 'Casero', nombreEn: 'Homemade' });

			const carta = await obtenerCartaPublica(prueba.bd);

			expect(carta.atributos.find((a) => a.clave === 'casero')).toMatchObject({ tipo: 'etiqueta', nombreEs: 'Casero', nombreEn: 'Homemade' });
		});
	});
});
