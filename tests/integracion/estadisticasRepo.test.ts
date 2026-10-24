import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { conteosPorDia, registrarEvento, totales } from '../../src/lib/repositorios/estadisticasRepo.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

describe('estadísticas diarias', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
	});

	afterEach(() => prueba.cerrar());

	it('crea el contador la primera vez y lo incrementa después', async () => {
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');

		const [dia] = await conteosPorDia(prueba.bd, ['2026-10-23']);

		expect(dia.conteos.visita).toBe(3);
	});

	it('lleva un contador aparte por día y por evento', async () => {
		await registrarEvento(prueba.bd, 'visita', '2026-10-22');
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');
		await registrarEvento(prueba.bd, 'qr_escaneo', '2026-10-23');
		await registrarEvento(prueba.bd, 'qr_escaneo', '2026-10-23');

		const dias = await conteosPorDia(prueba.bd, ['2026-10-22', '2026-10-23']);

		expect(dias.map((d) => [d.fecha, d.conteos.visita, d.conteos.qr_escaneo])).toEqual([
			['2026-10-22', 1, 0],
			['2026-10-23', 1, 2],
		]);
	});

	it('no pierde incrementos aunque lleguen muchos a la vez', async () => {
		await Promise.all(Array.from({ length: 40 }, () => registrarEvento(prueba.bd, 'clic_llamar', '2026-10-23')));

		const [dia] = await conteosPorDia(prueba.bd, ['2026-10-23']);

		expect(dia.conteos.clic_llamar).toBe(40);
	});

	it('devuelve todos los días pedidos, con ceros en los que no tuvieron movimiento, y todos los eventos', async () => {
		await registrarEvento(prueba.bd, 'visita', '2026-10-22');

		const dias = await conteosPorDia(prueba.bd, ['2026-10-21', '2026-10-22', '2026-10-23']);

		expect(dias.map((d) => d.fecha)).toEqual(['2026-10-21', '2026-10-22', '2026-10-23']);
		expect(dias[0].conteos).toEqual({
			visita: 0,
			qr_escaneo: 0,
			clic_llamar: 0,
			clic_mapa: 0,
			clic_resena: 0,
			clic_ubereats: 0,
			clic_compartir: 0,
			idioma_en: 0,
		});
	});

	it('ignora los días fuera del rango pedido', async () => {
		await registrarEvento(prueba.bd, 'visita', '2026-09-01');
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');

		const dias = await conteosPorDia(prueba.bd, ['2026-10-23']);

		expect(dias).toHaveLength(1);
		expect(dias[0].conteos.visita).toBe(1);
	});

	it('con una lista de fechas vacía no consulta nada', async () => {
		expect(await conteosPorDia(prueba.bd, [])).toEqual([]);
	});

	it('la base rechaza un evento desconocido (no se llena de basura)', async () => {
		await expect(
			prueba.bd.run(sql`insert into estadistica_diaria (fecha, evento, conteo) values ('2026-10-23', 'inventado', 1)`),
		).rejects.toThrow();
	});

	it('suma los totales de varios días', async () => {
		await registrarEvento(prueba.bd, 'visita', '2026-10-22');
		await registrarEvento(prueba.bd, 'visita', '2026-10-23');
		await registrarEvento(prueba.bd, 'clic_mapa', '2026-10-23');

		const resumen = totales(await conteosPorDia(prueba.bd, ['2026-10-22', '2026-10-23']));

		expect(resumen).toMatchObject({ visita: 2, clic_mapa: 1, qr_escaneo: 0 });
	});
});
