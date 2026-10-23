import { describe, expect, it } from 'vitest';
import { parsearHorario } from '../../src/lib/validacion/horarioFormulario.ts';

function formulario(campos: Record<string, string>): FormData {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
	return datos;
}

describe('parsearHorario', () => {
	it('sin ningún tramo el horario queda «por confirmar» (objeto vacío)', () => {
		expect(parsearHorario(formulario({}))).toEqual({ ok: true, horario: {} });
	});

	it('guarda solo los días con tramos; el resto queda cerrado', () => {
		const resultado = parsearHorario(
			formulario({ horario_lun_abre1: '12:00', horario_lun_cierra1: '23:30', horario_sab_abre1: '10:00', horario_sab_cierra1: '16:00' }),
		);

		expect(resultado).toEqual({
			ok: true,
			horario: { lun: [{ abre: '12:00', cierra: '23:30' }], sab: [{ abre: '10:00', cierra: '16:00' }] },
		});
	});

	it('permite dos tramos en un día (almuerzo y noche)', () => {
		const resultado = parsearHorario(
			formulario({ horario_vie_abre1: '08:00', horario_vie_cierra1: '15:00', horario_vie_abre2: '18:00', horario_vie_cierra2: '23:00' }),
		);

		expect(resultado).toMatchObject({ ok: true, horario: { vie: [{ abre: '08:00', cierra: '15:00' }, { abre: '18:00', cierra: '23:00' }] } });
	});

	it('acepta un tramo que cruza la medianoche', () => {
		const resultado = parsearHorario(formulario({ horario_dom_abre1: '12:00', horario_dom_cierra1: '01:00' }));

		expect(resultado).toMatchObject({ ok: true, horario: { dom: [{ abre: '12:00', cierra: '01:00' }] } });
	});

	it('ordena los tramos por hora de apertura', () => {
		const resultado = parsearHorario(
			formulario({ horario_mar_abre1: '18:00', horario_mar_cierra1: '22:00', horario_mar_abre2: '08:00', horario_mar_cierra2: '12:00' }),
		);

		expect(resultado).toMatchObject({ ok: true, horario: { mar: [{ abre: '08:00', cierra: '12:00' }, { abre: '18:00', cierra: '22:00' }] } });
	});

	it('exige que cada tramo tenga hora de apertura y de cierre', () => {
		const resultado = parsearHorario(formulario({ horario_lun_abre1: '12:00' }));

		expect(resultado).toEqual({ ok: false, errores: { horario_lun: 'Indica la hora de apertura y la de cierre.' } });
	});

	it.each(['24:00', '12:60', '9:00', 'mediodía', '12-00'])('rechaza la hora %j', (hora) => {
		const resultado = parsearHorario(formulario({ horario_lun_abre1: hora, horario_lun_cierra1: '20:00' }));

		expect(resultado).toEqual({ ok: false, errores: { horario_lun: 'Usa horas válidas, por ejemplo 12:00.' } });
	});

	it('rechaza abrir y cerrar a la misma hora', () => {
		const resultado = parsearHorario(formulario({ horario_lun_abre1: '12:00', horario_lun_cierra1: '12:00' }));

		expect(resultado).toEqual({ ok: false, errores: { horario_lun: 'La hora de cierre no puede ser igual a la de apertura.' } });
	});

	it('rechaza tramos que se superponen', () => {
		const resultado = parsearHorario(
			formulario({ horario_lun_abre1: '10:00', horario_lun_cierra1: '15:00', horario_lun_abre2: '14:00', horario_lun_cierra2: '20:00' }),
		);

		expect(resultado).toEqual({ ok: false, errores: { horario_lun: 'Los dos tramos del día no pueden superponerse.' } });
	});

	it('el tramo que cruza la medianoche debe ser el último del día', () => {
		const resultado = parsearHorario(
			formulario({ horario_lun_abre1: '20:00', horario_lun_cierra1: '02:00', horario_lun_abre2: '21:00', horario_lun_cierra2: '23:00' }),
		);

		expect(resultado).toMatchObject({ ok: false, errores: { horario_lun: expect.any(String) } });
	});

	it('informa los errores de varios días a la vez', () => {
		const resultado = parsearHorario(formulario({ horario_lun_abre1: '25:00', horario_lun_cierra1: '20:00', horario_mar_abre1: '12:00' }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['horario_lun', 'horario_mar']);
	});

	it('el horario que se guarda lo entiende la carta pública (abierto/cerrado)', async () => {
		const { estadoApertura } = await import('../../src/lib/dominio/horario.ts');
		const resultado = parsearHorario(formulario({ horario_lun_abre1: '12:00', horario_lun_cierra1: '01:00' }));
		if (!resultado.ok) throw new Error('debía ser válido');

		// Lunes 2026-10-26 a las 23:00 en Chile (UTC-3 en horario de verano).
		expect(estadoApertura(resultado.horario, new Date('2026-10-27T02:00:00Z'))).toEqual({ tipo: 'abierto', cierra: '01:00' });
	});
});
