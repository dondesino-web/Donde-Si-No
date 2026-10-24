import { z } from 'astro/zod';

/** Piezas compartidas por las validaciones de formularios del panel. Los mensajes van en español: los lee el dueño. */

export const PRECIO_MAXIMO = 1_000_000;
const MENSAJE_PRECIO = 'El precio debe ser solo números (por ejemplo 4500 o 4.500).';
const MENSAJE_FECHA = 'La fecha no es válida (usa el selector de fecha).';

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; errores: Record<string, string> };

/**
 * Interpreta el precio escrito por una persona: `4500`, `4.500` o `$ 4.500` (el punto es separador de miles).
 * Vacío = «Consultar» (`null`). Cualquier otra cosa = inválido (`undefined`).
 */
export function parsearPrecio(texto: string): number | null | undefined {
	const limpio = texto.trim().replace(/^\$\s*/, '');
	if (limpio === '') return null;
	if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(limpio)) return undefined;

	const precio = Number(limpio.replaceAll('.', ''));
	return precio <= PRECIO_MAXIMO ? precio : undefined;
}

/** `YYYY-MM-DD` que existe en el calendario (rechaza `2026-02-30`). */
export function esFechaISO(texto: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
	const [anio, mes, dia] = texto.split('-').map(Number);
	const fecha = new Date(Date.UTC(anio, mes - 1, dia));
	return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

export const texto = (mensajeVacio: string, maximo: number, nombreCampo: string) =>
	z
		.string()
		.trim()
		.min(1, mensajeVacio)
		.max(maximo, `${nombreCampo} no puede pasar de ${maximo} caracteres.`);

export const textoOpcional = (maximo: number, nombreCampo: string) =>
	z
		.string()
		.trim()
		.max(maximo, `${nombreCampo} no puede pasar de ${maximo} caracteres.`);

export const aNuloSiVacio = (valor: string): string | null => (valor === '' ? null : valor);

export const precioSchema = z.string().transform((valor, contexto) => {
	const precio = parsearPrecio(valor);
	if (precio === undefined) {
		contexto.addIssue({ code: 'custom', message: MENSAJE_PRECIO });
		return z.NEVER;
	}
	return precio;
});

/** Fecha opcional: vacío = sin fecha (`null`). */
export const fechaOpcionalSchema = z
	.string()
	.trim()
	.refine((valor) => valor === '' || esFechaISO(valor), MENSAJE_FECHA)
	.transform(aNuloSiVacio);

// Tope antes de validar: ningún campo legítimo se acerca, y evita trabajar con valores enormes.
const LARGO_MAXIMO_ENTRADA = 5000;
const VALORES_MAXIMOS_LISTA = 50;

export const cadena = (formulario: FormData, clave: string): string => {
	const valor = formulario.get(clave);
	// El navegador envía los saltos de línea de un textarea como CRLF, pero `maxlength` los cuenta como uno.
	return typeof valor === 'string' ? valor.slice(0, LARGO_MAXIMO_ENTRADA).replaceAll('\r\n', '\n') : '';
};
export const lista = (formulario: FormData, clave: string): string[] =>
	formulario
		.getAll(clave)
		.slice(0, VALORES_MAXIMOS_LISTA)
		.filter((v): v is string => typeof v === 'string');
export const casilla = (formulario: FormData, clave: string): boolean => formulario.has(clave);

export function aResultado<T>(analisis: { success: true; data: T } | { success: false; error: z.ZodError }): ResultadoValidacion<T> {
	if (analisis.success) return { ok: true, datos: analisis.data };

	const errores: Record<string, string> = {};
	for (const problema of analisis.error.issues) {
		const campo = String(problema.path[0] ?? 'formulario');
		errores[campo] ??= problema.message;
	}
	return { ok: false, errores };
}
