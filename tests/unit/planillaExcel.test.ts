import writeExcelFile from 'write-excel-file/node';
import { describe, expect, it } from 'vitest';
import { CLAVES_COLUMNA, ENCABEZADO } from '../../src/lib/excel/columnas.ts';
import { generarPlanilla, lineasDeInstrucciones } from '../../src/lib/excel/generar.ts';
import { TAMANO_MAXIMO_ARCHIVO, leerPlanilla } from '../../src/lib/excel/leer.ts';
import { planificarCambios } from '../../src/lib/excel/plan.ts';
import { categoriaDePrueba, productoDePrueba } from '../ayudantes/carta.ts';

const carta = () => [
	categoriaDePrueba({
		id: 1,
		nombreEs: 'Churrascos',
		productos: [
			productoDePrueba({ id: 10, categoriaId: 1, nombreEs: 'Churrasco', descripcionEs: 'Vacuno\ncon palta', precio: 6500, nombreEn: 'Churrasco EN', orden: 0 }),
			productoDePrueba({ id: 11, categoriaId: 1, nombreEs: '7', precio: null, disponible: false, visible: false, destacado: true, orden: 1 }),
		],
	}),
	categoriaDePrueba({ id: 2, nombreEs: 'Bebidas', productos: [productoDePrueba({ id: 20, categoriaId: 2, nombreEs: 'Café', precio: 1000, orden: 0 })] }),
];

const encabezados = CLAVES_COLUMNA.map((c) => ENCABEZADO[c]);

describe('generarPlanilla y leerPlanilla', () => {
	it('lo que se descarga se vuelve a leer idéntico: subirla sin tocarla no cambia nada', async () => {
		const archivo = await generarPlanilla(carta(), '24-10-2026');

		const lectura = await leerPlanilla(archivo);

		expect(lectura.ok).toBe(true);
		const plan = planificarCambios(lectura.ok ? lectura.filas : [], carta());
		expect(plan.errores).toEqual([]);
		expect(plan).toMatchObject({ nuevos: [], modificados: [], conflictos: [], sinCambios: 3, noIncluidos: 0 });
	});

	it('conserva descripciones con saltos de línea, nombres numéricos, vacíos y Sí/No', async () => {
		const lectura = await leerPlanilla(await generarPlanilla(carta(), '24-10-2026'));

		const filas = lectura.ok ? lectura.filas : [];
		expect(filas.map((f) => f.celdas.producto)).toEqual(['Churrasco', '7', 'Café']);
		expect(filas[0]?.celdas.descripcion).toBe('Vacuno\ncon palta');
		expect(filas[1]?.celdas).toMatchObject({ precio: null, disponible: 'No', visible: 'No', destacado: 'Sí' });
		expect(filas[0]?.celdas.precio).toBe(6500);
		expect(filas[0]?.celdas.id).toBe(10);
	});

	it('numera las filas como en la hoja: la primera de productos es la 2', async () => {
		const lectura = await leerPlanilla(await generarPlanilla(carta(), '24-10-2026'));

		expect(lectura.ok && lectura.filas.map((f) => f.fila)).toEqual([2, 3, 4]);
	});

	it('con una carta vacía genera igualmente la hoja con los títulos', async () => {
		const lectura = await leerPlanilla(await generarPlanilla([], '24-10-2026'));

		expect(lectura).toEqual({ ok: true, filas: [] });
	});

	it('las instrucciones explican las reglas y listan las categorías actuales', () => {
		const texto = lineasDeInstrucciones(carta(), '24-10-2026').join('\n');

		expect(texto).toContain('Descargada el 24-10-2026');
		expect(texto).toContain('Borrar una fila NO borra el producto');
		expect(texto).toContain('Churrascos, Bebidas');
	});
});

describe('leerPlanilla con planillas editadas por una persona', () => {
	const planilla = async (filas: (string | number | null)[][], opciones: { hoja?: string } = {}): Promise<Uint8Array> =>
		new Uint8Array(await writeExcelFile([{ data: filas.map((f) => f.map((v) => (v === null ? null : { value: v }))), sheet: opciones.hoja ?? 'Carta' }]).toBuffer());

	it('entiende las columnas en otro orden, sin tildes y con mayúsculas distintas', async () => {
		const lectura = await leerPlanilla(await planilla([['PRODUCTO', 'categoria', 'PRECIO'], ['Té', 'Bebidas', 1000]]));

		expect(lectura).toEqual({ ok: true, filas: [{ fila: 2, celdas: { producto: 'Té', categoria: 'Bebidas', precio: 1000 } }] });
	});

	it('las columnas que faltan no aparecen en la fila (así no se tocan al aplicar)', async () => {
		const lectura = await leerPlanilla(await planilla([['Categoría', 'Producto'], ['Bebidas', 'Té']]));

		expect(lectura.ok && Object.keys(lectura.filas[0]!.celdas)).toEqual(['categoria', 'producto']);
	});

	it('reconoce «ID» y «Versión» sin el « (no tocar)»', async () => {
		const lectura = await leerPlanilla(await planilla([['Categoría', 'Producto', 'ID', 'Versión'], ['Bebidas', 'Té', 5, 1000]]));

		expect(lectura.ok && lectura.filas[0]?.celdas).toMatchObject({ id: 5, version: 1000 });
	});

	it('si la hoja «Carta» no es la primera, usa «Carta»', async () => {
		const buffer = await writeExcelFile([
			{ data: [[{ value: 'otra cosa' }]], sheet: 'Notas' },
			{ data: [[{ value: 'Categoría' }, { value: 'Producto' }], [{ value: 'Bebidas' }, { value: 'Té' }]], sheet: 'carta' },
		]).toBuffer();

		const lectura = await leerPlanilla(new Uint8Array(buffer));

		expect(lectura.ok && lectura.filas[0]?.celdas.producto).toBe('Té');
	});

	it('salta filas de encabezado extra antes de los títulos y numera bien las filas', async () => {
		const lectura = await leerPlanilla(await planilla([['Mi carta de octubre'], ['Categoría', 'Producto'], ['Bebidas', 'Té']]));

		expect(lectura.ok && lectura.filas).toEqual([{ fila: 3, celdas: { categoria: 'Bebidas', producto: 'Té' } }]);
	});

	it('avisa qué columna falta si se borró un título obligatorio', async () => {
		const lectura = await leerPlanilla(await planilla([['Categoría', 'Precio'], ['Bebidas', 100]]));

		expect(lectura).toEqual({ ok: false, error: 'Falta la columna «Producto». No borres ni renombres los títulos de la planilla.' });
	});

	it('avisa si no hay fila de títulos', async () => {
		const lectura = await leerPlanilla(await planilla([['hola', 'mundo']]));

		expect(!lectura.ok && lectura.error).toContain('No encuentro la fila de títulos');
	});
});

describe('leerPlanilla rechaza lo que no es una planilla', () => {
	it('un archivo que no es Excel', async () => {
		const lectura = await leerPlanilla(new TextEncoder().encode('Categoría;Producto\nBebidas;Té'));

		expect(lectura).toEqual({ ok: false, error: expect.stringContaining('No se pudo leer el archivo') });
	});

	it('un zip corrupto que empieza como un Excel', async () => {
		const falso = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);

		expect(await leerPlanilla(falso)).toEqual({ ok: false, error: expect.stringContaining('No se pudo leer el archivo') });
	});

	it('un archivo vacío', async () => {
		expect(await leerPlanilla(new Uint8Array())).toMatchObject({ ok: false });
	});

	it('un archivo demasiado grande', async () => {
		const grande = new Uint8Array(TAMANO_MAXIMO_ARCHIVO + 1);

		expect(await leerPlanilla(grande)).toEqual({ ok: false, error: expect.stringContaining('demasiado grande') });
	});
});

describe('una carta grande', () => {
	it('genera y lee 1000 productos con rapidez y por debajo del tamaño máximo', async () => {
		const productos = Array.from({ length: 1000 }, (_, i) => productoDePrueba({ id: i + 1, categoriaId: 1, nombreEs: `Producto ${i}`, descripcionEs: 'Una descripción de ejemplo', precio: 1000 + i, orden: i }));
		const grande = [categoriaDePrueba({ id: 1, nombreEs: 'Todo', productos })];

		const archivo = await generarPlanilla(grande, '24-10-2026');
		const lectura = await leerPlanilla(archivo);

		expect(archivo.length).toBeLessThan(TAMANO_MAXIMO_ARCHIVO);
		expect(lectura.ok && lectura.filas).toHaveLength(1000);
		expect(planificarCambios(lectura.ok ? lectura.filas : [], grande).sinCambios).toBe(1000);
	});

	it('los títulos de la hoja son los esperados, en el orden esperado', async () => {
		const lectura = await leerPlanilla(await generarPlanilla([], '24-10-2026'));

		expect(lectura.ok).toBe(true);
		expect(encabezados).toEqual(['Categoría', 'Producto', 'Descripción', 'Precio', 'Disponible', 'Visible', 'Destacado', 'Nombre en inglés', 'Descripción en inglés', 'ID (no tocar)', 'Versión (no tocar)']);
	});
});
