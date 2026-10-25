import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { negocio } from '../../src/lib/db/esquema.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';
import { guardarTema, obtenerNegocioAdmin } from '../../src/lib/repositorios/adminLocalRepo.ts';
import { obtenerCartaPublica } from '../../src/lib/repositorios/cartaRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

let prueba: BdPrueba;

beforeEach(async () => {
	prueba?.cerrar();
	prueba = await crearBdPrueba();
});
afterAll(() => prueba?.cerrar());

describe('tema de diseño', () => {
	it('un local nuevo parte con el diseño clásico', async () => {
		await sembrar(prueba.bd);

		expect((await obtenerNegocioAdmin(prueba.bd))?.tema).toBe('clasico');
	});

	it('guardarTema cambia el diseño y la carta pública lo recibe', async () => {
		await sembrar(prueba.bd);

		expect(await guardarTema(prueba.bd, 'noche')).toBe(true);

		expect((await obtenerCartaPublica(prueba.bd)).negocio.tema).toBe('noche');
	});

	it('se puede volver a cambiar y solo cambia el tema, no el resto del local', async () => {
		await sembrar(prueba.bd);
		const antes = await obtenerNegocioAdmin(prueba.bd);

		await guardarTema(prueba.bd, 'fotos');
		await guardarTema(prueba.bd, 'bistro');

		const despues = await obtenerNegocioAdmin(prueba.bd);
		expect(despues).toMatchObject({ ...antes, tema: 'bistro' });
		expect(despues?.actualizadoEn.getTime()).toBeGreaterThanOrEqual(antes!.actualizadoEn.getTime());
	});

	it('devuelve false si el local todavía no existe', async () => {
		expect(await guardarTema(prueba.bd, 'bistro')).toBe(false);
		expect(await prueba.bd.select().from(negocio)).toHaveLength(0);
	});
});
