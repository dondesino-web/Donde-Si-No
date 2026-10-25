import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { buscarTema, esTema } from '../lib/dominio/temas.ts';
import { guardarTema } from '../lib/repositorios/adminLocalRepo.ts';
import { cadena } from '../lib/validacion/comun.ts';
import { exigirSesion, falla, publicar, type RespuestaAccion } from './ayudas.ts';

/** Diseño de la carta pública. Exige sesión por sí misma (ver `exigirSesion`). */
export const diseno = {
	guardarTema: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const tema = cadena(formulario, 'tema');
			if (!esTema(tema)) return falla('tema', 'Elige uno de los diseños de la lista.');

			if (!(await guardarTema(obtenerBd(), tema))) return falla('formulario', 'No hay datos del local: falta cargar la semilla inicial.');
			return publicar(contexto, `Diseño «${buscarTema(tema).nombre}» guardado. Tus clientes ya lo ven.`);
		},
	}),
};
