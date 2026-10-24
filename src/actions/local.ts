import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { guardarNegocio } from '../lib/repositorios/adminLocalRepo.ts';
import { CAMPOS_HORARIO } from '../lib/validacion/horarioFormulario.ts';
import { validarLocal } from '../lib/validacion/local.ts';
import { exigirSesion, falla, publicar, valoresDe, type RespuestaAccion } from './ayudas.ts';

const CAMPOS_LOCAL = [
	'esloganEs', 'esloganEn', 'descripcionEs', 'descripcionEn', 'telefono', 'whatsapp', 'direccion', 'comuna', 'region', 'codigoPostal',
	'latitud', 'longitud', 'mapsUrl', 'resenaUrl', 'instagramUrl', 'facebookUrl', 'ubereatsUrl', 'rangoPrecio', 'servicios',
	...CAMPOS_HORARIO,
];

/** Datos del local: contacto, redes, servicios y horario. Exige sesión por sí misma (ver `exigirSesion`). */
export const datosDelLocal = {
	guardarLocal: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarLocal(formulario);
			if (!validado.ok) return { ...validado, valores: valoresDe(formulario, CAMPOS_LOCAL) };

			if (!(await guardarNegocio(obtenerBd(), validado.datos))) {
				return falla('formulario', 'No hay datos del local: falta cargar la semilla inicial.');
			}
			return publicar(contexto, 'Datos del local guardados.');
		},
	}),
};
