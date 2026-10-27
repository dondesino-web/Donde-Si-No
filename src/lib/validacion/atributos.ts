import { z } from 'astro/zod';
import { TIPOS_ATRIBUTO, type TipoAtributo } from '../dominio/tipos.ts';
import { aNuloSiVacio, aResultado, cadena, texto, textoOpcional, type ResultadoValidacion } from './comun.ts';

export interface DatosAtributoFormulario {
	tipo: TipoAtributo;
	nombreEs: string;
	nombreEn: string | null;
}

const LARGO_MAXIMO = 40;

const atributoSchema = z.object({
	tipo: z.enum(TIPOS_ATRIBUTO, { error: 'Elige si es una etiqueta o un alérgeno.' }),
	nombreEs: texto('Escribe el nombre.', LARGO_MAXIMO, 'El nombre'),
	nombreEn: textoOpcional(LARGO_MAXIMO, 'El nombre en inglés').transform(aNuloSiVacio),
});

export function validarAtributo(formulario: FormData): ResultadoValidacion<DatosAtributoFormulario> {
	return aResultado(
		atributoSchema.safeParse({
			tipo: cadena(formulario, 'tipo'),
			nombreEs: cadena(formulario, 'nombreEs'),
			nombreEn: cadena(formulario, 'nombreEn'),
		}),
	);
}
