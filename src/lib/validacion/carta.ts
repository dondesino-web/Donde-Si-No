import { z } from 'astro/zod';
import { ALERGENOS, ETIQUETAS, type Alergeno, type Etiqueta } from '../dominio/tipos.ts';

export const PRECIO_MAXIMO = 1_000_000;
const MENSAJE_PRECIO = 'El precio debe ser solo números (por ejemplo 4500 o 4.500).';

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; errores: Record<string, string> };

export interface DatosProductoFormulario {
	categoriaId: number;
	nombreEs: string;
	nombreEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	precio: number | null;
	alergenos: Alergeno[];
	etiquetas: Etiqueta[];
	disponible: boolean;
	destacado: boolean;
	visible: boolean;
}

export interface DatosCategoriaFormulario {
	nombreEs: string;
	nombreEn: string | null;
	visible: boolean;
}

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

const texto = (mensajeVacio: string, maximo: number, nombreCampo: string) =>
	z
		.string()
		.trim()
		.min(1, mensajeVacio)
		.max(maximo, `${nombreCampo} no puede pasar de ${maximo} caracteres.`);

const textoOpcional = (maximo: number, nombreCampo: string) =>
	z
		.string()
		.trim()
		.max(maximo, `${nombreCampo} no puede pasar de ${maximo} caracteres.`);

const aNuloSiVacio = (valor: string): string | null => (valor === '' ? null : valor);

const precioSchema = z.string().transform((valor, contexto) => {
	const precio = parsearPrecio(valor);
	if (precio === undefined) {
		contexto.addIssue({ code: 'custom', message: MENSAJE_PRECIO });
		return z.NEVER;
	}
	return precio;
});

const sinRepetidos = <T>(valores: T[]): T[] => [...new Set(valores)];

const productoSchema = z.object({
	categoriaId: z
		.string()
		.regex(/^\d{1,9}$/, 'Elige una categoría.')
		.transform(Number)
		.refine((id) => id > 0, 'Elige una categoría.'),
	nombreEs: texto('Escribe el nombre del producto.', 80, 'El nombre'),
	nombreEn: textoOpcional(80, 'El nombre en inglés').transform(aNuloSiVacio),
	descripcionEs: textoOpcional(300, 'La descripción'),
	descripcionEn: textoOpcional(300, 'La descripción en inglés').transform(aNuloSiVacio),
	precio: precioSchema,
	alergenos: z
		.array(z.enum(ALERGENOS, { error: 'Alérgeno no válido.' }))
		.max(ALERGENOS.length, 'Demasiados alérgenos.')
		.transform(sinRepetidos),
	etiquetas: z
		.array(z.enum(ETIQUETAS, { error: 'Etiqueta no válida.' }))
		.max(ETIQUETAS.length, 'Demasiadas etiquetas.')
		.transform(sinRepetidos),
	disponible: z.boolean(),
	destacado: z.boolean(),
	visible: z.boolean(),
});

const categoriaSchema = z.object({
	nombreEs: texto('Escribe el nombre de la categoría.', 60, 'El nombre'),
	nombreEn: textoOpcional(60, 'El nombre en inglés').transform(aNuloSiVacio),
	visible: z.boolean(),
});

const cadena = (formulario: FormData, clave: string): string => {
	const valor = formulario.get(clave);
	return typeof valor === 'string' ? valor : '';
};
const lista = (formulario: FormData, clave: string): string[] =>
	formulario.getAll(clave).filter((v): v is string => typeof v === 'string');
const casilla = (formulario: FormData, clave: string): boolean => formulario.has(clave);

function aResultado<T>(analisis: { success: true; data: T } | { success: false; error: z.ZodError }): ResultadoValidacion<T> {
	if (analisis.success) return { ok: true, datos: analisis.data };

	const errores: Record<string, string> = {};
	for (const problema of analisis.error.issues) {
		const campo = String(problema.path[0] ?? 'formulario');
		errores[campo] ??= problema.message;
	}
	return { ok: false, errores };
}

export function validarProducto(formulario: FormData): ResultadoValidacion<DatosProductoFormulario> {
	return aResultado(
		productoSchema.safeParse({
			categoriaId: cadena(formulario, 'categoriaId'),
			nombreEs: cadena(formulario, 'nombreEs'),
			nombreEn: cadena(formulario, 'nombreEn'),
			descripcionEs: cadena(formulario, 'descripcionEs'),
			descripcionEn: cadena(formulario, 'descripcionEn'),
			precio: cadena(formulario, 'precio'),
			alergenos: lista(formulario, 'alergenos'),
			etiquetas: lista(formulario, 'etiquetas'),
			disponible: casilla(formulario, 'disponible'),
			destacado: casilla(formulario, 'destacado'),
			visible: casilla(formulario, 'visible'),
		}),
	);
}

export function validarCategoria(formulario: FormData): ResultadoValidacion<DatosCategoriaFormulario> {
	return aResultado(
		categoriaSchema.safeParse({
			nombreEs: cadena(formulario, 'nombreEs'),
			nombreEn: cadena(formulario, 'nombreEn'),
			visible: casilla(formulario, 'visible'),
		}),
	);
}
