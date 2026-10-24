import { describe, expect, it } from 'vitest';
import { rangoDeDias } from '../../src/lib/dominio/fechas.ts';

describe('rangoDeDias', () => {
	it('lista los días hasta la fecha indicada, del más antiguo al más reciente', () => {
		expect(rangoDeDias('2026-10-23', 3)).toEqual(['2026-10-21', '2026-10-22', '2026-10-23']);
	});

	it('un solo día es solo hoy', () => {
		expect(rangoDeDias('2026-10-23', 1)).toEqual(['2026-10-23']);
	});

	it('cruza fines de mes, de año y años bisiestos', () => {
		expect(rangoDeDias('2026-03-02', 5)).toEqual(['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
		expect(rangoDeDias('2024-03-01', 3)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
		expect(rangoDeDias('2027-01-02', 4)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
	});

	it('no se ve afectado por cambios de horario de verano', () => {
		expect(rangoDeDias('2026-09-08', 3)).toEqual(['2026-09-06', '2026-09-07', '2026-09-08']);
		expect(rangoDeDias('2026-04-06', 3)).toEqual(['2026-04-04', '2026-04-05', '2026-04-06']);
	});

	it('rechaza una fecha inválida o una cantidad fuera de rango', () => {
		expect(() => rangoDeDias('2026-02-30', 3)).toThrow();
		expect(() => rangoDeDias('hoy', 3)).toThrow();
		expect(() => rangoDeDias('2026-10-23', 0)).toThrow();
		expect(() => rangoDeDias('2026-10-23', 400)).toThrow();
	});
});
