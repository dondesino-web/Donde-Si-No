import writeExcelFile from 'write-excel-file/node';
import type { CategoriaConProductos } from '../repositorios/cartaRepo.ts';
import { CLAVES_COLUMNA, ENCABEZADO, NOMBRE_HOJA_CARTA, NOMBRE_HOJA_INSTRUCCIONES, type ClaveColumna } from './columnas.ts';

/** Planilla de la carta: la hoja «Carta» con todos los productos y la hoja «Instrucciones». */

const AZUL = '#0b2a6f';
const GRIS_CLARO = '#eeeeee';
const GRIS_TEXTO = '#595959';

const ANCHOS: Record<ClaveColumna, number> = { categoria: 22, producto: 34, descripcion: 46, precio: 12, disponible: 12, visible: 10, destacado: 12, nombreEn: 28, descripcionEn: 40, id: 14, version: 18 };
const TECNICAS: ReadonlySet<ClaveColumna> = new Set(['id', 'version']);

type CeldaEscritura = { value: string | number; type?: StringConstructor | NumberConstructor; format?: string; backgroundColor?: string; textColor?: string; fontWeight?: 'bold'; wrap?: boolean; alignVertical?: 'top' | 'center' | 'bottom' } | null;

export const textoSiNo = (valor: boolean): string => (valor ? 'Sí' : 'No');

/** Valores de cada producto en el orden de las columnas. Es la fuente de la hoja «Carta». */
export function valoresDeProducto(categoria: CategoriaConProductos, producto: CategoriaConProductos['productos'][number]): Record<ClaveColumna, string | number | null> {
	return {
		categoria: categoria.nombreEs,
		producto: producto.nombreEs,
		descripcion: producto.descripcionEs,
		precio: producto.precio,
		disponible: textoSiNo(producto.disponible),
		visible: textoSiNo(producto.visible),
		destacado: textoSiNo(producto.destacado),
		nombreEn: producto.nombreEn,
		descripcionEn: producto.descripcionEn,
		id: producto.id,
		// Segundos: es la precisión con que la base guarda «actualizado en».
		version: Math.floor(producto.actualizadoEn.getTime() / 1000),
	};
}

function celda(clave: ClaveColumna, valor: string | number | null): CeldaEscritura {
	if (valor === null || valor === '') return TECNICAS.has(clave) ? { value: '', backgroundColor: GRIS_CLARO } : null;
	const tecnica = TECNICAS.has(clave);
	const base = { ...(tecnica ? { backgroundColor: GRIS_CLARO, textColor: GRIS_TEXTO } : {}), alignVertical: 'top' as const };
	if (typeof valor === 'number') return { ...base, value: valor, type: Number, format: clave === 'precio' ? '#,##0' : '0' };
	// «@» = texto: Excel no intenta convertir un nombre como «7» o «1/2» en número o fecha.
	return { ...base, value: valor, type: String, format: '@', wrap: clave === 'descripcion' || clave === 'descripcionEn' };
}

export function filasDeCarta(carta: readonly CategoriaConProductos[]): CeldaEscritura[][] {
	const encabezado: CeldaEscritura[] = CLAVES_COLUMNA.map((clave) => ({
		value: ENCABEZADO[clave],
		fontWeight: 'bold',
		textColor: '#ffffff',
		backgroundColor: TECNICAS.has(clave) ? GRIS_TEXTO : AZUL,
		alignVertical: 'center',
		wrap: true,
	}));
	const filas = carta.flatMap((categoria) =>
		categoria.productos.map((producto) => {
			const valores = valoresDeProducto(categoria, producto);
			return CLAVES_COLUMNA.map((clave) => celda(clave, valores[clave]));
		}),
	);
	return [encabezado, ...filas];
}

export function lineasDeInstrucciones(carta: readonly CategoriaConProductos[], fecha: string): string[] {
	const categorias = carta.map((c) => c.nombreEs).join(', ') || '(todavía no hay categorías)';
	return [
		'Planilla de la carta de Dónde Si No',
		`Descargada el ${fecha}. Cada vez que quieras cambiar la carta con Excel, descarga la planilla de nuevo desde el panel (Carga rápida).`,
		'',
		'CÓMO USARLA',
		'1. En la hoja «Carta», cambia lo que necesites: nombres, descripciones, precios, disponibilidad, etc.',
		'2. Para agregar un producto, escribe una fila nueva al final y deja las dos últimas columnas (ID y Versión) vacías.',
		'3. Guarda el archivo como Excel (.xlsx) y súbelo en el panel: Carga rápida → Con Excel. Antes de guardar nada, el panel te muestra un resumen para que lo revises.',
		'',
		'REGLAS',
		'• No cambies las columnas grises «ID» y «Versión»: así el panel sabe qué producto es cada fila y si alguien lo cambió mientras tanto.',
		'• No borres ni cambies el nombre de la fila de títulos (la primera).',
		'• Borrar una fila NO borra el producto. Para eliminar un producto, hazlo en el panel (Carta).',
		'• Precio: solo números, por ejemplo 4500 o 4.500. Si lo dejas vacío, la carta muestra «Consultar».',
		'• Disponible, Visible y Destacado: escribe Sí o No. Si dejas Disponible o Visible vacío en un producto que ya existe, se mantiene como está; en un producto nuevo queda Sí.',
		'• Categoría: escribe el nombre tal como aparece. Si escribes una que no existe, se crea. Si cambias la categoría de un producto, se mueve.',
		'• El orden de las filas dentro de cada categoría es el orden en que se ve en la carta.',
		'• Si un producto se modificó en el panel después de descargar la planilla y tu fila también lo cambia, ese producto se omite para no pisar el cambio (el resumen te avisa).',
		'• Los productos que no aparezcan en la planilla no se tocan.',
		'',
		'CATEGORÍAS ACTUALES',
		categorias,
	];
}

/** Genera el archivo .xlsx con la carta actual. `fecha` es solo para mostrar (por ejemplo «24-10-2026»). */
export async function generarPlanilla(carta: readonly CategoriaConProductos[], fecha: string): Promise<Uint8Array> {
	const instrucciones: CeldaEscritura[][] = lineasDeInstrucciones(carta, fecha).map((linea, indice) => [
		linea === '' ? null : { value: linea, type: String, wrap: true, alignVertical: 'top', ...(indice === 0 || /^[A-ZÁÉÍÓÚÑ ]+$/.test(linea) ? { fontWeight: 'bold' as const, textColor: AZUL } : {}) },
	]);
	const buffer = await writeExcelFile([
		{ data: filasDeCarta(carta), sheet: NOMBRE_HOJA_CARTA, columns: CLAVES_COLUMNA.map((clave) => ({ width: ANCHOS[clave] })), stickyRowsCount: 1, stickyColumnsCount: 2 },
		{ data: instrucciones, sheet: NOMBRE_HOJA_INSTRUCCIONES, columns: [{ width: 110 }] },
	]).toBuffer();
	return new Uint8Array(buffer);
}
