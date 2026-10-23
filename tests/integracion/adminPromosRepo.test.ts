import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	actualizarPromocion,
	crearPromocion,
	eliminarPromocion,
	establecerPromocionActiva,
	guardarMenuDia,
	listarPromociones,
	moverPromocion,
	obtenerMenuDiaAdmin,
	obtenerPromocion,
	type DatosMenuDia,
	type DatosPromocion,
} from '../../src/lib/repositorios/adminPromosRepo.ts';
import { obtenerCartaPublica } from '../../src/lib/repositorios/cartaRepo.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const promocion = (cambios: Partial<DatosPromocion> = {}): DatosPromocion => ({
	tituloEs: '2x1',
	tituloEn: null,
	descripcionEs: '',
	descripcionEn: null,
	precio: null,
	activa: true,
	desde: null,
	hasta: null,
	...cambios,
});

const menu = (cambios: Partial<DatosMenuDia> = {}): DatosMenuDia => ({
	tituloEs: 'Pastel de choclo',
	tituloEn: null,
	descripcionEs: '',
	descripcionEn: null,
	precio: 4990,
	fecha: null,
	activo: true,
	...cambios,
});

describe('repositorio de promociones y menú del día', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	const titulos = async () => (await listarPromociones(prueba.bd)).map((p) => p.tituloEs);

	describe('promociones', () => {
		it('crea con orden consecutivo y lista todas, también las inactivas', async () => {
			const a = await crearPromocion(prueba.bd, promocion({ tituloEs: 'A' }));
			const b = await crearPromocion(prueba.bd, promocion({ tituloEs: 'B', activa: false }));

			expect([a.orden, b.orden]).toEqual([0, 1]);
			expect(await titulos()).toEqual(['A', 'B']);
		});

		it('actualiza todos los campos, incluidas las fechas', async () => {
			const { id } = await crearPromocion(prueba.bd, promocion());

			const ok = await actualizarPromocion(prueba.bd, id, promocion({ tituloEs: 'Combo', precio: 6990, desde: '2026-10-01', hasta: '2026-10-31' }));

			expect(ok).toBe(true);
			expect(await obtenerPromocion(prueba.bd, id)).toMatchObject({ tituloEs: 'Combo', precio: 6990, desde: '2026-10-01', hasta: '2026-10-31' });
		});

		it('activa y desactiva sin tocar el resto', async () => {
			const { id } = await crearPromocion(prueba.bd, promocion({ tituloEs: 'Solo estado', precio: 1000 }));

			await establecerPromocionActiva(prueba.bd, id, false);

			expect(await obtenerPromocion(prueba.bd, id)).toMatchObject({ activa: false, tituloEs: 'Solo estado', precio: 1000 });
		});

		it('informa cuando la promoción no existe', async () => {
			expect(await actualizarPromocion(prueba.bd, 99, promocion())).toBe(false);
			expect(await establecerPromocionActiva(prueba.bd, 99, true)).toBe(false);
			expect(await eliminarPromocion(prueba.bd, 99)).toBe(false);
		});

		it('mueve arriba y abajo, y no se sale de los extremos', async () => {
			for (const t of ['A', 'B', 'C']) await crearPromocion(prueba.bd, promocion({ tituloEs: t }));
			const [a, , c] = await listarPromociones(prueba.bd);

			await moverPromocion(prueba.bd, c.id, 'arriba');
			expect(await titulos()).toEqual(['A', 'C', 'B']);

			expect(await moverPromocion(prueba.bd, a.id, 'arriba')).toBe(false);
			expect(await titulos()).toEqual(['A', 'C', 'B']);
		});

		it('elimina una promoción', async () => {
			const { id } = await crearPromocion(prueba.bd, promocion());

			expect(await eliminarPromocion(prueba.bd, id)).toBe(true);
			expect(await titulos()).toEqual([]);
		});

		it('la carta pública solo muestra las activas y vigentes hoy (hora de Chile)', async () => {
			await sembrar(prueba.bd);
			const ahora = new Date('2026-10-23T15:00:00Z');
			await crearPromocion(prueba.bd, promocion({ tituloEs: 'Vigente' }));
			await crearPromocion(prueba.bd, promocion({ tituloEs: 'Apagada', activa: false }));
			await crearPromocion(prueba.bd, promocion({ tituloEs: 'Futura', desde: '2026-10-24' }));
			await crearPromocion(prueba.bd, promocion({ tituloEs: 'Vencida', hasta: '2026-10-22' }));
			await crearPromocion(prueba.bd, promocion({ tituloEs: 'Hasta hoy', hasta: '2026-10-23' }));

			const carta = await obtenerCartaPublica(prueba.bd, ahora);

			expect(carta.promociones.map((p) => p.tituloEs)).toEqual(['Vigente', 'Hasta hoy']);
		});
	});

	describe('menú del día', () => {
		it('no hay menú hasta que se guarda el primero', async () => {
			expect(await obtenerMenuDiaAdmin(prueba.bd)).toBeUndefined();
		});

		it('guardar crea el menú la primera vez y lo actualiza después: siempre una sola fila', async () => {
			await guardarMenuDia(prueba.bd, menu());
			await guardarMenuDia(prueba.bd, menu({ tituloEs: 'Cazuela', precio: null, fecha: '2026-10-23', activo: false }));

			expect(await obtenerMenuDiaAdmin(prueba.bd)).toMatchObject({ tituloEs: 'Cazuela', precio: null, fecha: '2026-10-23', activo: false });
			const filas = await prueba.bd.all<{ n: number }>(sql`select count(*) as n from menu_dia`);
			expect(filas[0].n).toBe(1);
		});

		it('dos primeros guardados simultáneos no crean dos filas', async () => {
			await Promise.all([guardarMenuDia(prueba.bd, menu({ tituloEs: 'Uno' })), guardarMenuDia(prueba.bd, menu({ tituloEs: 'Dos' }))]);

			const filas = await prueba.bd.all<{ n: number }>(sql`select count(*) as n from menu_dia`);
			expect(filas[0].n).toBe(1);
		});

		it('la carta pública lo muestra solo si está activo y es de hoy (o sin fecha)', async () => {
			await sembrar(prueba.bd);
			const ahora = new Date('2026-10-23T15:00:00Z');

			await guardarMenuDia(prueba.bd, menu({ fecha: '2026-10-22' }));
			expect((await obtenerCartaPublica(prueba.bd, ahora)).menuDia).toBeNull();

			await guardarMenuDia(prueba.bd, menu({ fecha: '2026-10-23' }));
			expect((await obtenerCartaPublica(prueba.bd, ahora)).menuDia?.tituloEs).toBe('Pastel de choclo');

			await guardarMenuDia(prueba.bd, menu({ fecha: null, activo: false }));
			expect((await obtenerCartaPublica(prueba.bd, ahora)).menuDia).toBeNull();
		});
	});
});
