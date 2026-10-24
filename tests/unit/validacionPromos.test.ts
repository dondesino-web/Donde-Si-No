import { describe, expect, it } from 'vitest';
import { esFechaISO, validarMenuDia, validarPromocion } from '../../src/lib/validacion/promociones.ts';

function formulario(campos: Record<string, string>): FormData {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
	return datos;
}

describe('esFechaISO', () => {
	it.each(['2026-10-23', '2024-02-29', '2026-12-31'])('acepta %s', (fecha) => {
		expect(esFechaISO(fecha)).toBe(true);
	});

	it.each(['', '2026-13-01', '2026-02-30', '2025-02-29', '23-10-2026', '2026-1-1', '2026-10-23T10:00', 'mañana'])('rechaza %j', (fecha) => {
		expect(esFechaISO(fecha)).toBe(false);
	});
});

describe('validarPromocion', () => {
	it('acepta una promoción mínima: activa solo si se marca', () => {
		expect(validarPromocion(formulario({ tituloEs: ' 2x1 en completos ' }))).toEqual({
			ok: true,
			datos: {
				tituloEs: '2x1 en completos',
				tituloEn: null,
				descripcionEs: '',
				descripcionEn: null,
				precio: null,
				activa: false,
				desde: null,
				hasta: null,
			},
		});
	});

	it('lee precio, fechas y casilla', () => {
		const resultado = validarPromocion(
			formulario({ tituloEs: 'Combo', precio: '$ 6.990', desde: '2026-10-01', hasta: '2026-10-31', activa: 'on' }),
		);

		expect(resultado).toMatchObject({
			ok: true,
			datos: { precio: 6990, desde: '2026-10-01', hasta: '2026-10-31', activa: true },
		});
	});

	it('exige el título y valida precio y fechas, en español', () => {
		const resultado = validarPromocion(formulario({ tituloEs: ' ', precio: 'gratis', desde: '2026-02-30' }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(resultado.errores.tituloEs).toBe('Escribe el título de la promoción.');
		expect(resultado.errores.precio).toMatch(/solo números/i);
		expect(resultado.errores.desde).toMatch(/fecha no es válida/i);
	});

	it('no permite que «hasta» sea anterior a «desde»', () => {
		const resultado = validarPromocion(formulario({ tituloEs: 'X', desde: '2026-10-20', hasta: '2026-10-10' }));

		expect(resultado).toMatchObject({ ok: false, errores: { hasta: expect.stringMatching(/anterior/i) } });
	});

	it('acepta el mismo día en «desde» y «hasta»', () => {
		expect(validarPromocion(formulario({ tituloEs: 'X', desde: '2026-10-20', hasta: '2026-10-20' })).ok).toBe(true);
	});

	it('limita el largo de los textos', () => {
		const resultado = validarPromocion(formulario({ tituloEs: 'x'.repeat(81), descripcionEs: 'y'.repeat(301) }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['descripcionEs', 'tituloEs']);
	});
});

describe('validarMenuDia', () => {
	it('acepta un menú con fecha y descripción de varias líneas', () => {
		const resultado = validarMenuDia(
			formulario({ tituloEs: 'Pastel de choclo', descripcionEs: 'Ensalada\nPostre', precio: '4.990', fecha: '2026-10-23', activo: 'on' }),
		);

		expect(resultado).toMatchObject({
			ok: true,
			datos: { tituloEs: 'Pastel de choclo', descripcionEs: 'Ensalada\nPostre', precio: 4990, fecha: '2026-10-23', activo: true },
		});
	});

	it('cuenta los saltos de línea del navegador (\r\n) como un solo carácter', () => {
		const detalle = `${'x'.repeat(9)}\r\n`.repeat(59); // 649 con \r\n, 590 normalizado
		const resultado = validarMenuDia(formulario({ tituloEs: 'Menú', descripcionEs: detalle }));

		expect(resultado.ok).toBe(true);
		if (resultado.ok) expect(resultado.datos.descripcionEs).not.toContain('\r');
	});

	it('la fecha es opcional: sin fecha se muestra cualquier día', () => {
		expect(validarMenuDia(formulario({ tituloEs: 'Menú' }))).toMatchObject({ ok: true, datos: { fecha: null, activo: false } });
	});

	it('exige el título y una fecha válida', () => {
		const resultado = validarMenuDia(formulario({ tituloEs: '', fecha: 'hoy' }));

		expect(resultado).toMatchObject({
			ok: false,
			errores: { tituloEs: 'Escribe el título del menú.', fecha: expect.stringMatching(/fecha no es válida/i) },
		});
	});
});
