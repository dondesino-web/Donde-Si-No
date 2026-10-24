import { describe, expect, it } from 'vitest';
import { LIMITES_FOTO, validarFotos } from '../../src/lib/almacenamiento/validarFoto.ts';
import { crearPng, crearWebp } from '../ayudantes/imagenes.ts';

describe('validarFotos', () => {
	it('acepta las dos versiones coherentes y devuelve las dimensiones de la grande', async () => {
		const resultado = validarFotos(await crearWebp(480, 320), await crearWebp(1200, 800));

		expect(resultado).toEqual({ ok: true, ancho: 1200, alto: 800 });
	});

	it('tolera el redondeo de la proporción al reducir', async () => {
		expect(validarFotos(await crearWebp(480, 359), await crearWebp(1200, 898)).ok).toBe(true);
	});

	it('rechaza archivos que no son WebP', async () => {
		const resultado = validarFotos(await crearWebp(480, 320), await crearPng(1200, 800));

		expect(resultado).toEqual({ ok: false, error: 'La foto no es un WebP válido.' });
	});

	it('rechaza una foto demasiado pesada sin siquiera leerla', async () => {
		const pesada = new Uint8Array(LIMITES_FOTO.bytesGrande + 1);

		expect(validarFotos(await crearWebp(480, 320), pesada)).toEqual({ ok: false, error: 'La foto es demasiado pesada (máximo 1,5 MB).' });
		expect(validarFotos(new Uint8Array(LIMITES_FOTO.bytesChica + 1), await crearWebp(1200, 800))).toMatchObject({ ok: false });
	});

	it('rechaza dimensiones fuera de lo esperado', async () => {
		const grande = validarFotos(await crearWebp(480, 320), await crearWebp(LIMITES_FOTO.ladoMaximoGrande + 1, 800));
		const chicaGrande = validarFotos(await crearWebp(LIMITES_FOTO.ladoMaximoChica + 1, 320), await crearWebp(1200, 800));

		expect(grande).toEqual({ ok: false, error: 'La foto es demasiado grande en píxeles.' });
		expect(chicaGrande).toEqual({ ok: false, error: 'La foto es demasiado grande en píxeles.' });
	});

	it('rechaza dos versiones que no son la misma imagen (otra proporción o la chica mayor que la grande)', async () => {
		const otraProporcion = validarFotos(await crearWebp(480, 480), await crearWebp(1200, 800));
		const invertidas = validarFotos(await crearWebp(600, 400), await crearWebp(300, 200));

		expect(otraProporcion).toEqual({ ok: false, error: 'Las dos versiones de la foto no coinciden.' });
		expect(invertidas).toEqual({ ok: false, error: 'Las dos versiones de la foto no coinciden.' });
	});
});
