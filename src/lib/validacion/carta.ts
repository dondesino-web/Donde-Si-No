import { z } from 'astro/zod';
import { ALERGENOS, ETIQUETAS, type Alergeno, type Etiqueta } from '../dominio/tipos.ts';
import { aNuloSiVacio, aResultado, cadena, casilla, lista, precioSchema, texto, textoOpcional, type ResultadoValidacion } from './comun.ts';

export { PRECIO_MAXIMO, parsearPrecio, type ResultadoValidacion } from './comun.ts';

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
