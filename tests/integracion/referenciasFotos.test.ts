import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Imagen } from '../../src/lib/dominio/tipos.ts';
import { crearCategoria, crearProducto } from '../../src/lib/repositorios/adminCartaRepo.ts';
import { crearFoto } from '../../src/lib/repositorios/adminFotosRepo.ts';
import { crearPromocion } from '../../src/lib/repositorios/adminPromosRepo.ts';
import { urlsSinUso } from '../../src/lib/repositorios/referenciasFotos.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const foto = (n: number): Imagen => ({ sm: `/uploads/${n}-sm.webp`, lg: `/uploads/${n}-lg.webp`, ancho: 1200, alto: 800, altEs: `Foto ${n}` });

describe('urlsSinUso', () => {
	let prueba: BdPrueba;
	let categoriaId: number;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
		categoriaId = (await crearCategoria(prueba.bd, { nombreEs: 'Churrascos', nombreEn: null, visible: true })).id;
	});

	afterEach(() => prueba.cerrar());

	it('devuelve todas las URLs si nadie las usa', async () => {
		expect(await urlsSinUso(prueba.bd, ['/uploads/1-sm.webp', '/uploads/1-lg.webp'])).toEqual(['/uploads/1-sm.webp', '/uploads/1-lg.webp']);
	});

	it('no devuelve las que usa un producto, una promoción o la galería', async () => {
		await crearProducto(prueba.bd, {
			categoriaId,
			nombreEs: 'A',
			nombreEn: null,
			descripcionEs: '',
			descripcionEn: null,
			precio: 1,
			alergenos: [],
			etiquetas: [],
			disponible: true,
			destacado: false,
			visible: true,
			imagen: foto(1),
		});
		await crearPromocion(prueba.bd, { tituloEs: 'P', tituloEn: null, descripcionEs: '', descripcionEn: null, precio: null, activa: true, desde: null, hasta: null, imagen: foto(2) });
		await crearFoto(prueba.bd, foto(3));

		const resultado = await urlsSinUso(prueba.bd, [
			'/uploads/1-sm.webp',
			'/uploads/2-lg.webp',
			'/uploads/3-sm.webp',
			'/uploads/4-sm.webp',
		]);

		expect(resultado).toEqual(['/uploads/4-sm.webp']);
	});

	it('trata las URLs como texto literal (comodines de SQL no engañan a la comprobación)', async () => {
		await crearFoto(prueba.bd, foto(1));

		expect(await urlsSinUso(prueba.bd, ['%', '_', '/uploads/%-sm.webp'])).toEqual(['%', '_', '/uploads/%-sm.webp']);
	});

	it('con una lista vacía no consulta nada', async () => {
		expect(await urlsSinUso(prueba.bd, [])).toEqual([]);
	});
});
