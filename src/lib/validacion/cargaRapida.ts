import { parsearPrecio } from './comun.ts';

/**
 * Interpreta el texto de la «Carga rápida»: un producto por línea, con columnas `nombre; precio; descripción`.
 * El separador es `;` o un tabulador (lo que se obtiene al copiar columnas de una planilla). El precio y la descripción son
 * opcionales: sin precio, el producto queda en «Consultar». Todo o nada: si una línea falla, no se acepta ninguna.
 */

export const LINEAS_MAXIMAS = 150;
const LARGO_NOMBRE = 80;
const LARGO_DESCRIPCION = 300;

export interface ProductoRapido {
	nombreEs: string;
	precio: number | null;
	descripcionEs: string;
}

export type ResultadoCargaRapida = { ok: true; productos: ProductoRapido[] } | { ok: false; errores: string[] };

/** Clave para comparar nombres: sin mayúsculas, tildes ni espacios de más. */
export const claveDeNombre = (nombre: string): string =>
	nombre
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

function separar(linea: string): [string, string, string] {
	const separador = linea.includes('\t') ? '\t' : ';';
	const [nombre = '', precio = '', ...resto] = linea.split(separador);
	return [nombre.trim(), precio.trim(), resto.join(separador).trim()];
}

export function interpretarLineas(texto: string): ResultadoCargaRapida {
	const lineas = texto
		.split(/\r?\n/)
		.map((contenido, indice) => ({ numero: indice + 1, contenido: contenido.trim() }))
		.filter((linea) => linea.contenido !== '');

	if (lineas.length === 0) return { ok: false, errores: ['Escribe al menos un producto, uno por línea.'] };
	if (lineas.length > LINEAS_MAXIMAS) {
		return { ok: false, errores: [`Son demasiadas líneas: carga hasta ${LINEAS_MAXIMAS} productos por vez.`] };
	}

	const errores: string[] = [];
	const productos: ProductoRapido[] = [];
	const vistos = new Map<string, number>();

	for (const { numero, contenido } of lineas) {
		const [nombreEs, textoPrecio, descripcionEs] = separar(contenido);
		if (nombreEs === '') {
			errores.push(`Línea ${numero}: falta el nombre del producto.`);
			continue;
		}
		if (nombreEs.length > LARGO_NOMBRE) {
			errores.push(`Línea ${numero}: el nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`);
			continue;
		}
		const precio = parsearPrecio(textoPrecio);
		if (precio === undefined) {
			errores.push(`Línea ${numero}: el precio «${textoPrecio}» no es válido (usa solo números, por ejemplo 4500 o 4.500).`);
			continue;
		}
		if (descripcionEs.length > LARGO_DESCRIPCION) {
			errores.push(`Línea ${numero}: la descripción no puede pasar de ${LARGO_DESCRIPCION} caracteres.`);
			continue;
		}
		const clave = claveDeNombre(nombreEs);
		const antes = vistos.get(clave);
		if (antes !== undefined) {
			errores.push(`Línea ${numero}: «${nombreEs}» está repetido (ya está en la línea ${antes}).`);
			continue;
		}
		vistos.set(clave, numero);
		productos.push({ nombreEs, precio, descripcionEs });
	}

	return errores.length > 0 ? { ok: false, errores } : { ok: true, productos };
}
