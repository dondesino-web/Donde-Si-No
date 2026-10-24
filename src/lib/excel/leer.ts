import readExcelFile from 'read-excel-file/node';
import { ENCABEZADO, COLUMNAS_OBLIGATORIAS, NOMBRE_HOJA_CARTA, claveDeEncabezado, type ClaveColumna } from './columnas.ts';
import type { Celda, FilaCruda } from './plan.ts';
import { claveDeNombre } from '../validacion/cargaRapida.ts';

/** Tamaño máximo del archivo subido: una carta de 1000 productos pesa unos 60 KB. */
export const TAMANO_MAXIMO_ARCHIVO = 1024 * 1024;

export type ResultadoLectura = { ok: true; filas: FilaCruda[] } | { ok: false; error: string };

const NO_SE_PUDO_LEER = 'No se pudo leer el archivo. Sube un Excel (.xlsx) guardado desde la planilla que descargaste del panel.';

/** Los primeros bytes de un .xlsx (un zip) son «PK». Descarta de entrada archivos que no lo son. */
const pareceZip = (datos: Uint8Array): boolean => datos.length > 4 && datos[0] === 0x50 && datos[1] === 0x4b;

const comoCelda = (valor: unknown): Celda =>
	valor === null || valor === undefined || typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean' || valor instanceof Date ? (valor as Celda) : String(valor);

/** Lee la hoja «Carta» (o la primera, si no existe) usando los títulos de las columnas, en cualquier orden. */
export async function leerPlanilla(datos: Uint8Array): Promise<ResultadoLectura> {
	if (datos.length > TAMANO_MAXIMO_ARCHIVO) return { ok: false, error: 'El archivo es demasiado grande (máximo 1 MB). ¿Es la planilla de la carta?' };
	if (!pareceZip(datos)) return { ok: false, error: NO_SE_PUDO_LEER };

	let hojas: { sheet: string; data: unknown[][] }[];
	try {
		hojas = (await readExcelFile(Buffer.from(datos))) as { sheet: string; data: unknown[][] }[];
	} catch {
		return { ok: false, error: NO_SE_PUDO_LEER };
	}
	const hoja = hojas.find((h) => claveDeNombre(h.sheet) === claveDeNombre(NOMBRE_HOJA_CARTA)) ?? hojas[0];
	if (!hoja) return { ok: false, error: NO_SE_PUDO_LEER };

	const indiceEncabezado = hoja.data.findIndex((fila) => fila.some((valor) => claveDeEncabezado(valor) !== undefined));
	if (indiceEncabezado === -1) {
		return { ok: false, error: `No encuentro la fila de títulos (${COLUMNAS_OBLIGATORIAS.map((c) => `«${ENCABEZADO[c]}»`).join(', ')}…). No la borres ni le cambies los nombres.` };
	}
	const columnas = new Map<number, ClaveColumna>();
	for (const [indice, valor] of hoja.data[indiceEncabezado]!.entries()) {
		const clave = claveDeEncabezado(valor);
		if (clave && ![...columnas.values()].includes(clave)) columnas.set(indice, clave);
	}
	const presentes = new Set(columnas.values());
	const faltan = COLUMNAS_OBLIGATORIAS.filter((c) => !presentes.has(c));
	if (faltan.length > 0) return { ok: false, error: `Falta la columna ${faltan.map((c) => `«${ENCABEZADO[c]}»`).join(' y ')}. No borres ni renombres los títulos de la planilla.` };

	const filas: FilaCruda[] = hoja.data.slice(indiceEncabezado + 1).map((valores, desplazamiento) => {
		const celdas: Partial<Record<ClaveColumna, Celda>> = {};
		for (const [indice, clave] of columnas) celdas[clave] = comoCelda(valores[indice]);
		return { fila: indiceEncabezado + desplazamiento + 2, celdas };
	});
	return { ok: true, filas };
}
