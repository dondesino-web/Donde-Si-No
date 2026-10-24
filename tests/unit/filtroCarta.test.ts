import { describe, expect, it } from 'vitest';
import { coincideFiltro, estadosDe, resumenDeCarta, textoBuscable } from '../../src/lib/dominio/filtroCarta.ts';

const producto = (cambios: Partial<{ nombreEs: string; descripcionEs: string; precio: number | null; disponible: boolean; visible: boolean }> = {}) => ({
	nombreEs: 'Churrasco italiano',
	descripcionEs: 'Vacuno con palta',
	precio: 6500 as number | null,
	disponible: true,
	visible: true,
	...cambios,
});

describe('estadosDe', () => {
	it('un producto normal no tiene ningún estado especial', () => {
		expect(estadosDe(producto())).toEqual([]);
	});

	it('detecta sin precio, agotado y oculto, juntos o por separado', () => {
		expect(estadosDe(producto({ precio: null }))).toEqual(['sin-precio']);
		expect(estadosDe(producto({ disponible: false }))).toEqual(['agotado']);
		expect(estadosDe(producto({ visible: false, precio: null }))).toEqual(['sin-precio', 'oculto']);
	});
});

describe('textoBuscable', () => {
	it('junta nombre y descripción sin mayúsculas ni tildes', () => {
		expect(textoBuscable(producto({ nombreEs: 'Sándwich Ave', descripcionEs: 'Con MAYO' }))).toBe('sandwich ave con mayo');
	});
});

describe('coincideFiltro', () => {
	const texto = 'churrasco italiano vacuno con palta';

	it('sin búsqueda y con «todos» muestra todo', () => {
		expect(coincideFiltro(texto, [], '', 'todos')).toBe(true);
	});

	it('busca sin distinguir mayúsculas, tildes ni espacios de más', () => {
		expect(coincideFiltro(texto, [], '  CHURRASCO ', 'todos')).toBe(true);
		expect(coincideFiltro('sandwich ave', [], 'sándwich', 'todos')).toBe(true);
		expect(coincideFiltro(texto, [], 'hamburguesa', 'todos')).toBe(false);
	});

	it('busca en la descripción también', () => {
		expect(coincideFiltro(texto, [], 'palta', 'todos')).toBe(true);
	});

	it('todas las palabras de la búsqueda deben estar, en cualquier orden', () => {
		expect(coincideFiltro(texto, [], 'palta churrasco', 'todos')).toBe(true);
		expect(coincideFiltro(texto, [], 'palta lasagna', 'todos')).toBe(false);
	});

	it('el filtro muestra solo los productos con ese estado', () => {
		expect(coincideFiltro(texto, ['sin-precio'], '', 'sin-precio')).toBe(true);
		expect(coincideFiltro(texto, [], '', 'sin-precio')).toBe(false);
		expect(coincideFiltro(texto, ['agotado'], '', 'agotados')).toBe(true);
		expect(coincideFiltro(texto, ['oculto', 'agotado'], '', 'ocultos')).toBe(true);
		expect(coincideFiltro(texto, ['agotado'], '', 'ocultos')).toBe(false);
	});

	it('combina la búsqueda con el filtro', () => {
		expect(coincideFiltro(texto, ['agotado'], 'churrasco', 'agotados')).toBe(true);
		expect(coincideFiltro(texto, ['agotado'], 'lasagna', 'agotados')).toBe(false);
	});
});

describe('resumenDeCarta', () => {
	it('cuenta productos, sin precio, agotados y ocultos', () => {
		const resumen = resumenDeCarta([
			producto(),
			producto({ precio: null }),
			producto({ disponible: false }),
			producto({ visible: false, precio: null }),
		]);

		expect(resumen).toEqual({ total: 4, sinPrecio: 2, agotados: 1, ocultos: 1 });
	});

	it('con una carta vacía todo es cero', () => {
		expect(resumenDeCarta([])).toEqual({ total: 0, sinPrecio: 0, agotados: 0, ocultos: 0 });
	});
});
