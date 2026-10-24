import { describe, expect, it } from 'vitest';
import { planificarCambios, type FilaCruda } from '../../src/lib/excel/plan.ts';
import { categoriaDePrueba, productoDePrueba } from '../ayudantes/carta.ts';

// Carta de la base: Churrascos (id 1) con 2 productos y Bebidas (id 2) con 1.
const FECHA = new Date('2026-10-01T12:00:00Z');
const VERSION = Math.floor(FECHA.getTime() / 1000);
const carta = () => [
	categoriaDePrueba({
		id: 1,
		nombreEs: 'Churrascos',
		productos: [
			productoDePrueba({ id: 10, categoriaId: 1, nombreEs: 'Churrasco', descripcionEs: 'Vacuno', precio: 6500, orden: 0, actualizadoEn: FECHA }),
			productoDePrueba({ id: 11, categoriaId: 1, nombreEs: 'Churrasco pollo', precio: null, orden: 1, actualizadoEn: FECHA }),
		],
	}),
	categoriaDePrueba({
		id: 2,
		nombreEs: 'Bebidas',
		productos: [productoDePrueba({ id: 20, categoriaId: 2, nombreEs: 'Café', precio: 1000, orden: 0, actualizadoEn: FECHA })],
	}),
];

/** Fila tal como la deja el lector: con todas las columnas de la planilla. */
const fila = (numero: number, celdas: Record<string, unknown>): FilaCruda => ({
	fila: numero,
	celdas: { categoria: null, producto: null, descripcion: null, precio: null, disponible: null, visible: null, destacado: null, nombreEn: null, descripcionEn: null, id: null, version: null, ...celdas },
});
const existente = (numero: number, id: number, celdas: Record<string, unknown>) => fila(numero, { id, version: VERSION, ...celdas });

describe('filas sin cambios', () => {
	it('una fila igual a la base no cambia nada', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500, disponible: 'Sí', visible: 'Sí', destacado: 'No' })], carta());

		expect(plan.errores).toEqual([]);
		expect(plan).toMatchObject({ nuevos: [], modificados: [], sinCambios: 1 });
	});

	it('ignora las filas completamente vacías', () => {
		const plan = planificarCambios([fila(2, {}), fila(3, { producto: '   ' })], carta());

		expect(plan.errores).toEqual([]);
		expect(plan.nuevos).toEqual([]);
	});

	it('cuenta los productos de la base que no están en la planilla y no los toca', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })], carta());

		expect(plan.noIncluidos).toBe(2);
	});
});

describe('productos modificados', () => {
	it('detecta el cambio de precio y de nombre, y dice qué campos cambiaron', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco italiano', descripcion: 'Vacuno', precio: 7000 })], carta());

		expect(plan.modificados).toHaveLength(1);
		expect(plan.modificados[0]).toMatchObject({ id: 10, nombre: 'Churrasco italiano', campos: ['Producto', 'Precio'], cambios: { nombreEs: 'Churrasco italiano', precio: 7000 } });
	});

	it('un precio vacío significa «Consultar» (null)', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: null })], carta());

		expect(plan.modificados[0]?.cambios).toEqual({ precio: null });
	});

	it('acepta precios escritos como texto: 4.500, $ 4500 o un número', () => {
		const precios = ['4.500', '$ 4500', 4500].map((precio) => {
			const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio })], carta());
			return plan.modificados[0]?.cambios.precio;
		});

		expect(precios).toEqual([4500, 4500, 4500]);
	});

	it('entiende Sí/No, true/false y variantes en Disponible, Visible y Destacado', () => {
		const plan = planificarCambios(
			[existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500, disponible: 'no', visible: false, destacado: 'SÍ' })],
			carta(),
		);

		expect(plan.modificados[0]?.cambios).toEqual({ disponible: false, visible: false, destacado: true });
		expect(plan.modificados[0]?.campos).toEqual(['Disponible', 'Visible', 'Destacado']);
	});

	it('una casilla vacía en un producto que ya existe deja el valor actual', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500, disponible: null })], carta());

		expect(plan.modificados).toEqual([]);
	});

	it('mover el producto a otra categoría cuenta como cambio', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'bebídas', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })], carta());

		expect(plan.modificados[0]).toMatchObject({ id: 10, campos: ['Categoría'], categoria: { tipo: 'existente', id: 2 } });
	});

	it('un campo cuya columna no está en la planilla no se toca', () => {
		const sinPrecio: FilaCruda = { fila: 2, celdas: { id: 10, version: VERSION, categoria: 'Churrascos', producto: 'Churrasco nuevo' } };

		const plan = planificarCambios([sinPrecio], carta());

		expect(plan.modificados[0]?.cambios).toEqual({ nombreEs: 'Churrasco nuevo' });
	});

	it('el nombre en inglés vacío lo quita (null)', () => {
		const base = carta();
		base[0]!.productos[0]!.nombreEn = 'Churrasco EN';

		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500, nombreEn: null })], base);

		expect(plan.modificados[0]?.cambios).toEqual({ nombreEn: null });
	});
});

describe('productos nuevos', () => {
	it('una fila sin ID crea un producto con valores por defecto (disponible y visible; no destacado)', () => {
		const plan = planificarCambios([fila(5, { categoria: 'Bebidas', producto: 'Té', precio: 1000 })], carta());

		expect(plan.errores).toEqual([]);
		expect(plan.nuevos).toEqual([
			{
				fila: 5,
				categoria: { tipo: 'existente', id: 2 },
				datos: { nombreEs: 'Té', descripcionEs: '', precio: 1000, disponible: true, visible: true, destacado: false, nombreEn: null, descripcionEn: null },
			},
		]);
	});

	it('una categoría que no existe se crea, una sola vez aunque aparezca en varias filas', () => {
		const plan = planificarCambios([fila(2, { categoria: 'Almuerzos', producto: 'Costillar', precio: 8000 }), fila(3, { categoria: ' ALMUERZOS ', producto: 'Pollo asado' })], carta());

		expect(plan.categoriasNuevas).toEqual([{ clave: 'almuerzos', nombreEs: 'Almuerzos' }]);
		expect(plan.nuevos.map((n) => n.categoria)).toEqual([{ tipo: 'nueva', clave: 'almuerzos' }, { tipo: 'nueva', clave: 'almuerzos' }]);
	});

	it('un producto que ya existe en esa categoría no se duplica: se omite con un aviso', () => {
		const plan = planificarCambios([fila(4, { categoria: 'Bebidas', producto: 'CAFE', precio: 1500 })], carta());

		expect(plan.nuevos).toEqual([]);
		expect(plan.avisos).toEqual(['Fila 4: «CAFE» ya existe en Bebidas; no se duplica ni se cambia. Para modificarlo, usa su fila de la planilla descargada.']);
	});
});

describe('errores (no se aplica nada)', () => {
	it('exige categoría y nombre en un producto nuevo, y nombre en uno existente', () => {
		const plan = planificarCambios([fila(2, { producto: 'Sin categoría' }), fila(3, { categoria: 'Bebidas', precio: 100 }), existente(4, 10, { categoria: 'Churrascos', producto: '' })], carta());

		expect(plan.errores).toEqual(['Fila 2: falta la categoría.', 'Fila 3: falta el nombre del producto.', 'Fila 4: falta el nombre del producto.']);
	});

	it('señala precios inválidos, negativos, con decimales o demasiado altos', () => {
		const plan = planificarCambios(
			[fila(2, { categoria: 'Bebidas', producto: 'A', precio: 'mil' }), fila(3, { categoria: 'Bebidas', producto: 'B', precio: -5 }), fila(4, { categoria: 'Bebidas', producto: 'C', precio: 10.5 }), fila(5, { categoria: 'Bebidas', producto: 'D', precio: 5_000_000 })],
			carta(),
		);

		expect(plan.errores).toHaveLength(4);
		expect(plan.errores[0]).toBe('Fila 2: el precio «mil» no es válido (usa solo números, por ejemplo 4500).');
		expect(plan.errores.every((e) => e.includes('precio'))).toBe(true);
	});

	it('señala valores no válidos en Disponible, Visible y Destacado', () => {
		const plan = planificarCambios([fila(2, { categoria: 'Bebidas', producto: 'A', disponible: 'tal vez' })], carta());

		expect(plan.errores).toEqual(['Fila 2: «tal vez» no vale en Disponible (escribe Sí o No).']);
	});

	it('limita el largo de nombre, descripción y categoría', () => {
		const plan = planificarCambios([fila(2, { categoria: 'C'.repeat(61), producto: 'N'.repeat(81), descripcion: 'D'.repeat(301) })], carta());

		expect(plan.errores).toEqual([
			'Fila 2: la categoría no puede pasar de 60 caracteres.',
			'Fila 2: el nombre no puede pasar de 80 caracteres.',
			'Fila 2: la descripción no puede pasar de 300 caracteres.',
		]);
	});

	it('rechaza dos filas nuevas con el mismo producto en la misma categoría', () => {
		const plan = planificarCambios([fila(2, { categoria: 'Bebidas', producto: 'Té' }), fila(3, { categoria: 'bebidas', producto: 'té' })], carta());

		expect(plan.errores).toEqual(['Fila 3: «té» está repetido en Bebidas (ya está en la fila 2).']);
	});

	it('rechaza el mismo ID en dos filas', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Uno' }), existente(3, 10, { categoria: 'Churrascos', producto: 'Dos' })], carta());

		expect(plan.errores).toEqual(['Fila 3: el ID 10 está repetido (ya está en la fila 2).']);
	});

	it('rechaza un ID que no es un número', () => {
		const plan = planificarCambios([fila(2, { id: 'abc', categoria: 'Bebidas', producto: 'A' })], carta());

		expect(plan.errores).toEqual(['Fila 2: el ID «abc» no es válido. No lo cambies: déjalo como estaba o bórralo para crear un producto nuevo.']);
	});

	it('rechaza renombrar un producto con el nombre de otro de la misma categoría', () => {
		const plan = planificarCambios([existente(2, 11, { categoria: 'Churrascos', producto: 'churrasco' })], carta());

		expect(plan.errores).toEqual(['Fila 2: «churrasco» ya existe en Churrascos.']);
	});

	it('permite intercambiar los nombres de dos productos entre sí', () => {
		const plan = planificarCambios(
			[existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco pollo', descripcion: 'Vacuno', precio: 6500 }), existente(3, 11, { categoria: 'Churrascos', producto: 'Churrasco', precio: null })],
			carta(),
		);

		expect(plan.errores).toEqual([]);
		expect(plan.modificados).toHaveLength(2);
	});

	it('limita la cantidad de filas', () => {
		const filas = Array.from({ length: 1001 }, (_, i) => fila(i + 2, { categoria: 'Bebidas', producto: `P${i}` }));

		expect(planificarCambios(filas, carta()).errores).toEqual(['La planilla tiene demasiadas filas: carga hasta 1000 productos por vez.']);
	});

	it('si hay errores no propone ningún cambio', () => {
		const plan = planificarCambios([fila(2, { categoria: 'Bebidas', producto: 'Bueno' }), fila(3, { categoria: 'Bebidas', producto: 'Malo', precio: 'x' })], carta());

		expect(plan.errores).toHaveLength(1);
		expect(plan.nuevos).toEqual([]);
		expect(plan.modificados).toEqual([]);
	});
});

describe('avisos y conflictos (esas filas se omiten, el resto sigue)', () => {
	it('un ID que ya no existe se omite con un aviso', () => {
		const plan = planificarCambios([existente(2, 999, { categoria: 'Bebidas', producto: 'Fantasma' })], carta());

		expect(plan.errores).toEqual([]);
		expect(plan.modificados).toEqual([]);
		expect(plan.avisos).toEqual(['Fila 2: el producto con ID 999 ya no existe (se borró después de descargar la planilla). Se omite.']);
	});

	it('si el producto cambió en el panel después de descargar y la fila trae cambios, se omite como conflicto', () => {
		const base = carta();
		base[0]!.productos[0]!.actualizadoEn = new Date(FECHA.getTime() + 60_000);

		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 9999 })], base);

		expect(plan.modificados).toEqual([]);
		expect(plan.conflictos).toEqual([{ fila: 2, nombre: 'Churrasco' }]);
		expect(plan.avisos[0]).toContain('Fila 2: «Churrasco» cambió en el panel después de descargar la planilla');
	});

	it('si cambió en el panel pero la fila coincide con lo de ahora, no hay conflicto', () => {
		const base = carta();
		base[0]!.productos[0]!.actualizadoEn = new Date(FECHA.getTime() + 60_000);

		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })], base);

		expect(plan.conflictos).toEqual([]);
		expect(plan.sinCambios).toBe(1);
	});

	it('sin versión en la fila no se detecta conflicto y se aplica', () => {
		const base = carta();
		base[0]!.productos[0]!.actualizadoEn = new Date(FECHA.getTime() + 60_000);

		const plan = planificarCambios([fila(2, { id: 10, categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 1 })], base);

		expect(plan.modificados).toHaveLength(1);
	});
});

describe('orden', () => {
	it('el orden de las filas define el orden de cada categoría', () => {
		const plan = planificarCambios(
			[existente(2, 11, { categoria: 'Churrascos', producto: 'Churrasco pollo' }), existente(3, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 }), fila(4, { categoria: 'Churrascos', producto: 'Nuevo' })],
			carta(),
		);

		expect(plan.ordenCategorias).toEqual([{ categoria: { tipo: 'existente', id: 1 }, entradas: [{ id: 11 }, { id: 10 }, { nuevo: 0 }] }]);
	});

	it('los productos de categorías que no aparecen en la planilla no se reordenan', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })], carta());

		expect(plan.ordenCategorias.map((o) => o.categoria)).toEqual([{ tipo: 'existente', id: 1 }]);
	});
});

describe('cambios de orden', () => {
	it('solo reordenar las filas cuenta como un cambio de orden aunque ningún dato cambie', () => {
		const plan = planificarCambios(
			[existente(2, 11, { categoria: 'Churrascos', producto: 'Churrasco pollo' }), existente(3, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })],
			carta(),
		);

		expect(plan).toMatchObject({ modificados: [], nuevos: [], sinCambios: 2, reordenadas: 1 });
	});

	it('si el orden de la planilla es el que ya hay, no hay cambio de orden', () => {
		const plan = planificarCambios(
			[existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 }), existente(3, 11, { categoria: 'Churrascos', producto: 'Churrasco pollo' })],
			carta(),
		);

		expect(plan.reordenadas).toBe(0);
	});

	it('una planilla parcial en el mismo orden relativo no reordena nada', () => {
		const plan = planificarCambios([existente(2, 10, { categoria: 'Churrascos', producto: 'Churrasco', descripcion: 'Vacuno', precio: 6500 })], carta());

		expect(plan.reordenadas).toBe(0);
	});

	it('un producto nuevo en una categoría cuenta como cambio de orden de esa categoría', () => {
		const plan = planificarCambios([fila(2, { categoria: 'Bebidas', producto: 'Té' })], carta());

		expect(plan.reordenadas).toBe(1);
	});
});
