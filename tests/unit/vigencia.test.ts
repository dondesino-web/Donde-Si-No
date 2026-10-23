import { describe, expect, it } from 'vitest';
import { estadoMenuDia, estadoPromocion } from '../../src/lib/dominio/vigencia.ts';

const HOY = '2026-10-23';

describe('estadoPromocion', () => {
	it.each([
		[{ activa: false, desde: null, hasta: null }, 'inactiva'],
		[{ activa: false, desde: '2026-10-01', hasta: '2026-10-31' }, 'inactiva'],
		[{ activa: true, desde: null, hasta: null }, 'vigente'],
		[{ activa: true, desde: HOY, hasta: HOY }, 'vigente'],
		[{ activa: true, desde: '2026-10-24', hasta: null }, 'programada'],
		[{ activa: true, desde: null, hasta: '2026-10-22' }, 'vencida'],
		[{ activa: true, desde: '2026-10-01', hasta: '2026-10-22' }, 'vencida'],
	] as const)('%j → %s', (promocion, esperado) => {
		expect(estadoPromocion(promocion, HOY)).toBe(esperado);
	});
});

describe('estadoMenuDia', () => {
	it.each([
		[{ activo: false, fecha: null }, 'inactivo'],
		[{ activo: false, fecha: HOY }, 'inactivo'],
		[{ activo: true, fecha: null }, 'vigente'],
		[{ activo: true, fecha: HOY }, 'vigente'],
		[{ activo: true, fecha: '2026-10-24' }, 'programado'],
		[{ activo: true, fecha: '2026-10-22' }, 'vencido'],
	] as const)('%j → %s', (menu, esperado) => {
		expect(estadoMenuDia(menu, HOY)).toBe(esperado);
	});
});
