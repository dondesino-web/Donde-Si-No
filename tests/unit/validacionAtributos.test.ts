import { describe, expect, it } from 'vitest';
import { validarAtributo } from '../../src/lib/validacion/atributos.ts';

const formulario = (campos: Record<string, string>): FormData => {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
	return datos;
};

describe('validarAtributo', () => {
	it('acepta un nombre y deja el inglés en null si va vacío', () => {
		const resultado = validarAtributo(formulario({ tipo: 'alergeno', nombreEs: '  Apio ', nombreEn: '   ' }));

		expect(resultado).toEqual({ ok: true, datos: { tipo: 'alergeno', nombreEs: 'Apio', nombreEn: null } });
	});

	it('conserva el nombre en inglés', () => {
		const resultado = validarAtributo(formulario({ tipo: 'etiqueta', nombreEs: 'Casero', nombreEn: 'Homemade' }));

		expect(resultado).toMatchObject({ ok: true, datos: { nombreEn: 'Homemade' } });
	});

	it('exige el nombre', () => {
		const resultado = validarAtributo(formulario({ tipo: 'etiqueta', nombreEs: '   ' }));

		expect(resultado).toMatchObject({ ok: false, errores: { nombreEs: 'Escribe el nombre.' } });
	});

	it('rechaza un tipo desconocido', () => {
		const resultado = validarAtributo(formulario({ tipo: 'otra-cosa', nombreEs: 'X' }));

		expect(resultado).toMatchObject({ ok: false, errores: { tipo: expect.any(String) } });
	});

	it('limita el largo de los nombres', () => {
		const resultado = validarAtributo(formulario({ tipo: 'etiqueta', nombreEs: 'x'.repeat(41), nombreEn: 'y'.repeat(41) }));

		expect(resultado).toMatchObject({ ok: false, errores: { nombreEs: expect.any(String), nombreEn: expect.any(String) } });
	});
});
