import { describe, expect, it } from 'vitest';
import type { Horario } from '../../src/lib/dominio/tipos.ts';
import { agruparHorario, estadoApertura, fechaLocalISO, momentoLocal } from '../../src/lib/dominio/horario.ts';

// En octubre Chile continental está en UTC-3 (horario de verano).
const enChile = (fechaHora: string): Date => new Date(`${fechaHora}-03:00`);

const HORARIO: Horario = {
	lun: [{ abre: '12:00', cierra: '01:00' }],
	mar: [{ abre: '12:00', cierra: '01:00' }],
	mie: [{ abre: '12:00', cierra: '01:00' }],
	jue: [{ abre: '12:00', cierra: '01:00' }],
	vie: [{ abre: '12:00', cierra: '02:00' }],
	sab: [
		{ abre: '09:00', cierra: '13:00' },
		{ abre: '15:00', cierra: '23:00' },
	],
	dom: [],
};

describe('momentoLocal y fechaLocalISO', () => {
	it('convierte un instante a día y minutos en hora de Chile', () => {
		// 2026-10-23 03:30 UTC = viernes 00:30 en Chile.
		expect(momentoLocal(new Date('2026-10-23T03:30:00Z'))).toEqual({ dia: 'vie', minutos: 30 });
	});

	it('usa la fecha de Chile aunque en UTC ya sea otro día', () => {
		expect(fechaLocalISO(new Date('2026-10-23T02:00:00Z'))).toBe('2026-10-22');
	});
});

describe('estadoApertura', () => {
	it('sin horario cargado no afirma nada', () => {
		expect(estadoApertura({}, enChile('2026-10-21T13:00'))).toEqual({ tipo: 'sin-horario' });
	});

	it('está abierto dentro de un rango normal', () => {
		expect(estadoApertura(HORARIO, enChile('2026-10-21T13:00'))).toEqual({ tipo: 'abierto', cierra: '01:00' });
	});

	it('sigue abierto después de medianoche gracias al rango del día anterior', () => {
		// Jueves 00:30: aún vale el rango del miércoles (12:00–01:00).
		expect(estadoApertura(HORARIO, enChile('2026-10-22T00:30'))).toEqual({ tipo: 'abierto', cierra: '01:00' });
	});

	it('cierra a la hora exacta de cierre', () => {
		expect(estadoApertura(HORARIO, enChile('2026-10-22T01:00'))).toEqual({ tipo: 'cerrado' });
	});

	it('está cerrado antes de abrir', () => {
		expect(estadoApertura(HORARIO, enChile('2026-10-21T11:59'))).toEqual({ tipo: 'cerrado' });
	});

	it('respeta varios rangos en el mismo día', () => {
		expect(estadoApertura(HORARIO, enChile('2026-10-24T14:00'))).toEqual({ tipo: 'cerrado' });
		expect(estadoApertura(HORARIO, enChile('2026-10-24T16:00'))).toEqual({ tipo: 'abierto', cierra: '23:00' });
	});

	it('un día sin rangos está cerrado, salvo lo que arrastra el día anterior', () => {
		expect(estadoApertura(HORARIO, enChile('2026-10-25T12:00'))).toEqual({ tipo: 'cerrado' });
		// El sábado cierra a las 23:00, así que el domingo a las 00:30 ya está cerrado.
		expect(estadoApertura(HORARIO, enChile('2026-10-25T00:30'))).toEqual({ tipo: 'cerrado' });
	});

	it('un día que abre y cierra a la misma hora se considera abierto las 24 horas', () => {
		const siempre: Horario = { mie: [{ abre: '00:00', cierra: '00:00' }] };

		expect(estadoApertura(siempre, enChile('2026-10-21T03:00'))).toEqual({ tipo: 'abierto', cierra: '00:00' });
	});
});

describe('agruparHorario', () => {
	it('agrupa días consecutivos con el mismo horario, incluidos los cerrados', () => {
		expect(agruparHorario(HORARIO)).toEqual([
			{ dias: ['lun', 'mar', 'mie', 'jue'], rangos: [{ abre: '12:00', cierra: '01:00' }] },
			{ dias: ['vie'], rangos: [{ abre: '12:00', cierra: '02:00' }] },
			{ dias: ['sab'], rangos: HORARIO.sab },
			{ dias: ['dom'], rangos: [] },
		]);
	});

	it('devuelve una lista vacía si no hay horario cargado', () => {
		expect(agruparHorario({})).toEqual([]);
	});
});
