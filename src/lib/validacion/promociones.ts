import { z } from 'astro/zod';
import {
	aNuloSiVacio,
	aResultado,
	cadena,
	casilla,
	fechaOpcionalSchema,
	precioSchema,
	texto,
	textoOpcional,
	type ResultadoValidacion,
} from './comun.ts';

export { esFechaISO } from './comun.ts';

export interface DatosPromocionFormulario {
	tituloEs: string;
	tituloEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	precio: number | null;
	activa: boolean;
	desde: string | null;
	hasta: string | null;
}

export interface DatosMenuDiaFormulario {
	tituloEs: string;
	tituloEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	precio: number | null;
	fecha: string | null;
	activo: boolean;
}

const promocionSchema = z
	.object({
		tituloEs: texto('Escribe el título de la promoción.', 80, 'El título'),
		tituloEn: textoOpcional(80, 'El título en inglés').transform(aNuloSiVacio),
		descripcionEs: textoOpcional(300, 'La descripción'),
		descripcionEn: textoOpcional(300, 'La descripción en inglés').transform(aNuloSiVacio),
		precio: precioSchema,
		activa: z.boolean(),
		desde: fechaOpcionalSchema,
		hasta: fechaOpcionalSchema,
	})
	// Las fechas ISO se comparan como texto: el orden alfabético coincide con el cronológico.
	.refine((p) => p.desde === null || p.hasta === null || p.hasta >= p.desde, {
		path: ['hasta'],
		message: 'La fecha «hasta» no puede ser anterior a «desde».',
	});

const menuDiaSchema = z.object({
	tituloEs: texto('Escribe el título del menú.', 80, 'El título'),
	tituloEn: textoOpcional(80, 'El título en inglés').transform(aNuloSiVacio),
	descripcionEs: textoOpcional(600, 'El detalle'),
	descripcionEn: textoOpcional(600, 'El detalle en inglés').transform(aNuloSiVacio),
	precio: precioSchema,
	fecha: fechaOpcionalSchema,
	activo: z.boolean(),
});

export function validarPromocion(formulario: FormData): ResultadoValidacion<DatosPromocionFormulario> {
	return aResultado(
		promocionSchema.safeParse({
			tituloEs: cadena(formulario, 'tituloEs'),
			tituloEn: cadena(formulario, 'tituloEn'),
			descripcionEs: cadena(formulario, 'descripcionEs'),
			descripcionEn: cadena(formulario, 'descripcionEn'),
			precio: cadena(formulario, 'precio'),
			activa: casilla(formulario, 'activa'),
			desde: cadena(formulario, 'desde'),
			hasta: cadena(formulario, 'hasta'),
		}),
	);
}

export function validarMenuDia(formulario: FormData): ResultadoValidacion<DatosMenuDiaFormulario> {
	return aResultado(
		menuDiaSchema.safeParse({
			tituloEs: cadena(formulario, 'tituloEs'),
			tituloEn: cadena(formulario, 'tituloEn'),
			descripcionEs: cadena(formulario, 'descripcionEs'),
			descripcionEn: cadena(formulario, 'descripcionEn'),
			precio: cadena(formulario, 'precio'),
			fecha: cadena(formulario, 'fecha'),
			activo: casilla(formulario, 'activo'),
		}),
	);
}
