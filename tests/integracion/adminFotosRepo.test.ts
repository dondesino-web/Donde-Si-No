import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Imagen } from '../../src/lib/dominio/tipos.ts';
import { crearCategoria, crearProducto, actualizarProducto, obtenerProducto } from '../../src/lib/repositorios/adminCartaRepo.ts';
import {
	MAX_FOTOS,
	crearFoto,
	eliminarFoto,
	listarFotos,
	moverFoto,
} from '../../src/lib/repositorios/adminFotosRepo.ts';
import { actualizarPromocion, crearPromocion, obtenerPromocion } from '../../src/lib/repositorios/adminPromosRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const foto = (n: number): Imagen => ({ sm: `/uploads/${n}-sm.webp`, lg: `/uploads/${n}-lg.webp`, ancho: 1200, alto: 800, altEs: `Foto ${n}` });

describe('fotos', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	describe('galería de destacadas', () => {
		it('agrega fotos con orden consecutivo', async () => {
			const a = await crearFoto(prueba.bd, foto(1));
			const b = await crearFoto(prueba.bd, foto(2));

			expect(a).toMatchObject({ ok: true, foto: { orden: 0 } });
			expect(b).toMatchObject({ ok: true, foto: { orden: 1 } });
			expect((await listarFotos(prueba.bd)).map((f) => f.imagen.altEs)).toEqual(['Foto 1', 'Foto 2']);
		});

		it('admite como máximo 8 fotos', async () => {
			for (let i = 0; i < MAX_FOTOS; i++) expect((await crearFoto(prueba.bd, foto(i))).ok).toBe(true);

			expect(await crearFoto(prueba.bd, foto(99))).toEqual({ ok: false, motivo: 'lleno' });
			expect(MAX_FOTOS).toBe(8);
			expect(await listarFotos(prueba.bd)).toHaveLength(8);
		});

		it('no se pasa de 8 aunque lleguen varias subidas a la vez', async () => {
			const resultados = await Promise.all(Array.from({ length: 12 }, (_, i) => crearFoto(prueba.bd, foto(i))));

			expect(resultados.filter((r) => r.ok)).toHaveLength(8);
			expect(await listarFotos(prueba.bd)).toHaveLength(8);
		});

		it('elimina una foto y devuelve lo eliminado para borrar sus archivos', async () => {
			const creada = await crearFoto(prueba.bd, foto(1));
			if (!creada.ok) throw new Error('debía crearse');

			const eliminada = await eliminarFoto(prueba.bd, creada.foto.id);

			expect(eliminada?.imagen).toEqual(foto(1));
			expect(await listarFotos(prueba.bd)).toEqual([]);
			expect(await eliminarFoto(prueba.bd, creada.foto.id)).toBeUndefined();
		});

		it('mueve fotos arriba y abajo', async () => {
			for (const n of [1, 2, 3]) await crearFoto(prueba.bd, foto(n));
			const [, , tercera] = await listarFotos(prueba.bd);

			expect(await moverFoto(prueba.bd, tercera.id, 'arriba')).toBe(true);
			expect((await listarFotos(prueba.bd)).map((f) => f.imagen.altEs)).toEqual(['Foto 1', 'Foto 3', 'Foto 2']);
			expect(await moverFoto(prueba.bd, (await listarFotos(prueba.bd))[0].id, 'arriba')).toBe(false);
		});
	});

	describe('foto de un producto', () => {
		const datos = (categoriaId: number, imagen?: Imagen | null) => ({
			categoriaId,
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
			...(imagen === undefined ? {} : { imagen }),
		});

		it('guarda la foto al crear, la conserva al editar sin tocarla y la quita con null', async () => {
			const { id: categoriaId } = await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true });
			const { id } = await crearProducto(prueba.bd, datos(categoriaId, foto(1)));
			expect((await obtenerProducto(prueba.bd, id))?.imagen).toEqual(foto(1));

			await actualizarProducto(prueba.bd, id, { ...datos(categoriaId), nombreEs: 'Churrasco italiano' });
			expect(await obtenerProducto(prueba.bd, id)).toMatchObject({ nombreEs: 'Churrasco italiano', imagen: foto(1) });

			await actualizarProducto(prueba.bd, id, datos(categoriaId, foto(2)));
			expect((await obtenerProducto(prueba.bd, id))?.imagen).toEqual(foto(2));

			await actualizarProducto(prueba.bd, id, datos(categoriaId, null));
			expect((await obtenerProducto(prueba.bd, id))?.imagen).toBeNull();
		});
	});

	describe('foto de una promoción', () => {
		const datos = (imagen?: Imagen | null) => ({
			tituloEs: '2x1',
			tituloEn: null,
			descripcionEs: '',
			descripcionEn: null,
			precio: null,
			activa: true,
			desde: null,
			hasta: null,
			...(imagen === undefined ? {} : { imagen }),
		});

		it('guarda, conserva y quita la foto', async () => {
			const { id } = await crearPromocion(prueba.bd, datos(foto(1)));
			expect((await obtenerPromocion(prueba.bd, id))?.imagen).toEqual(foto(1));

			await actualizarPromocion(prueba.bd, id, { ...datos(), tituloEs: 'Combo' });
			expect(await obtenerPromocion(prueba.bd, id)).toMatchObject({ tituloEs: 'Combo', imagen: foto(1) });

			await actualizarPromocion(prueba.bd, id, datos(null));
			expect((await obtenerPromocion(prueba.bd, id))?.imagen).toBeNull();
		});
	});
});
