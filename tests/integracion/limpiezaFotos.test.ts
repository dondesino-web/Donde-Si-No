import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AlmacenImagenes, ArchivoAlmacenado } from '../../src/lib/almacenamiento/almacen.ts';
import { MAX_ELIMINACIONES_POR_EJECUCION, limpiarHuerfanas } from '../../src/lib/almacenamiento/limpieza.ts';
import type { Imagen } from '../../src/lib/dominio/tipos.ts';
import { crearFoto } from '../../src/lib/repositorios/adminFotosRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const AHORA = new Date('2026-10-24T12:00:00Z');
const horas = (n: number) => new Date(AHORA.getTime() - n * 60 * 60 * 1000);
const foto = (n: number): Imagen => ({ sm: `/uploads/${n}-sm.webp`, lg: `/uploads/${n}-lg.webp`, ancho: 1200, alto: 800, altEs: `Foto ${n}` });

/** Un almacén en memoria: lista lo que se le da y recuerda qué se eliminó. */
function almacenFalso(archivos: ArchivoAlmacenado[], fallar: string[] = []): AlmacenImagenes & { eliminados: string[] } {
	const eliminados: string[] = [];
	return {
		tipo: 'local',
		eliminados,
		subir: async () => ({ clave: 'x', url: 'x' }),
		reconoce: () => true,
		listar: async () => archivos,
		eliminar: async (url) => {
			if (fallar.includes(url)) throw new Error('no se pudo');
			eliminados.push(url);
		},
	};
}

describe('limpiarHuerfanas', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	it('borra las fotos antiguas que ningún registro usa y respeta las que están en uso', async () => {
		await crearFoto(prueba.bd, foto(1));
		const almacen = almacenFalso([
			{ url: '/uploads/1-sm.webp', subidoEn: horas(100) },
			{ url: '/uploads/1-lg.webp', subidoEn: horas(100) },
			{ url: '/uploads/2-sm.webp', subidoEn: horas(100) },
			{ url: '/uploads/2-lg.webp', subidoEn: horas(100) },
		]);

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(almacen.eliminados.sort()).toEqual(['/uploads/2-lg.webp', '/uploads/2-sm.webp']);
		expect(resultado).toEqual({ revisadas: 4, eliminadas: 2, fallidas: 0, abortada: false });
	});

	it('no toca las subidas recientes: pueden ser un formulario que todavía no se guardó', async () => {
		const almacen = almacenFalso([
			{ url: '/uploads/3-sm.webp', subidoEn: horas(2) },
			{ url: '/uploads/3-lg.webp', subidoEn: horas(23) },
			{ url: '/uploads/4-sm.webp', subidoEn: horas(25) },
		]);

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(almacen.eliminados).toEqual(['/uploads/4-sm.webp']);
		expect(resultado.revisadas).toBe(1);
	});

	it('un fallo al borrar un archivo no detiene la limpieza del resto', async () => {
		const almacen = almacenFalso(
			[
				{ url: '/uploads/5-sm.webp', subidoEn: horas(100) },
				{ url: '/uploads/5-lg.webp', subidoEn: horas(100) },
			],
			['/uploads/5-sm.webp'],
		);

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(almacen.eliminados).toEqual(['/uploads/5-lg.webp']);
		expect(resultado).toMatchObject({ eliminadas: 1, fallidas: 1 });
	});

	it('freno: si TODAS las fotos antiguas parecen huérfanas (y son muchas), no borra nada: puede ser la base equivocada', async () => {
		const archivos = Array.from({ length: 20 }, (_, i) => ({ url: `/uploads/${i}-sm.webp`, subidoEn: horas(100) }));
		const almacen = almacenFalso(archivos);

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(almacen.eliminados).toEqual([]);
		expect(resultado).toEqual({ revisadas: 20, eliminadas: 0, fallidas: 0, abortada: true });
	});

	it('el freno actúa desde 5 archivos antiguos: una carta pequeña tampoco pierde todo por una base equivocada', async () => {
		const almacen = almacenFalso(Array.from({ length: 5 }, (_, i) => ({ url: `/uploads/${i}-sm.webp`, subidoEn: horas(100) })));

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(almacen.eliminados).toEqual([]);
		expect(resultado.abortada).toBe(true);
	});

	it('con pocas fotos y todas huérfanas sí limpia (el freno solo aplica a lotes de 5 o más)', async () => {
		const almacen = almacenFalso(Array.from({ length: 4 }, (_, i) => ({ url: `/uploads/${i}-sm.webp`, subidoEn: horas(100) })));

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(resultado).toMatchObject({ eliminadas: 4, abortada: false });
	});

	it('limita cuántos archivos borra por ejecución; el resto queda para la siguiente', async () => {
		await crearFoto(prueba.bd, foto(0));
		const total = MAX_ELIMINACIONES_POR_EJECUCION + 30;
		const archivos = [
			{ url: '/uploads/0-sm.webp', subidoEn: horas(100) },
			...Array.from({ length: total }, (_, i) => ({ url: `/uploads/o${i}-sm.webp`, subidoEn: horas(100) })),
		];
		const almacen = almacenFalso(archivos);

		const resultado = await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA });

		expect(resultado.eliminadas).toBe(MAX_ELIMINACIONES_POR_EJECUCION);
		expect(almacen.eliminados).not.toContain('/uploads/0-sm.webp');
	});

	it('un almacén que no sabe listar (no hay nada que limpiar) no es un error', async () => {
		const almacen: AlmacenImagenes = { tipo: 'local', subir: async () => ({ clave: 'x', url: 'x' }), eliminar: async () => {}, reconoce: () => true };

		expect(await limpiarHuerfanas({ almacen, bd: prueba.bd, ahora: AHORA })).toEqual({ revisadas: 0, eliminadas: 0, fallidas: 0, abortada: false });
	});
});
