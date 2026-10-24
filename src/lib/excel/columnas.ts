import { claveDeNombre } from '../validacion/cargaRapida.ts';

/** Columnas de la planilla de la carta. El orden es el de la hoja «Carta». */

export const CLAVES_COLUMNA = ['categoria', 'producto', 'descripcion', 'precio', 'disponible', 'visible', 'destacado', 'nombreEn', 'descripcionEn', 'id', 'version'] as const;
export type ClaveColumna = (typeof CLAVES_COLUMNA)[number];

export const ENCABEZADO: Record<ClaveColumna, string> = {
	categoria: 'Categoría',
	producto: 'Producto',
	descripcion: 'Descripción',
	precio: 'Precio',
	disponible: 'Disponible',
	visible: 'Visible',
	destacado: 'Destacado',
	nombreEn: 'Nombre en inglés',
	descripcionEn: 'Descripción en inglés',
	id: 'ID (no tocar)',
	version: 'Versión (no tocar)',
};

export const NOMBRE_HOJA_CARTA = 'Carta';
export const NOMBRE_HOJA_INSTRUCCIONES = 'Instrucciones';

/** Columnas sin las cuales no se puede leer la planilla. */
export const COLUMNAS_OBLIGATORIAS: readonly ClaveColumna[] = ['categoria', 'producto'];

const POR_ENCABEZADO = new Map<string, ClaveColumna>([
	...CLAVES_COLUMNA.map((clave) => [claveDeNombre(ENCABEZADO[clave]), clave] as const),
	// Alias: quien borre el « (no tocar)» sigue siendo entendido.
	['id', 'id'],
	['version', 'version'],
]);

/** Reconoce un encabezado de la hoja sin distinguir mayúsculas, tildes ni espacios de más. */
export const claveDeEncabezado = (encabezado: unknown): ClaveColumna | undefined =>
	typeof encabezado === 'string' ? POR_ENCABEZADO.get(claveDeNombre(encabezado)) : undefined;
