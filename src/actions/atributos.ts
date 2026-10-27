import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { actualizarAtributo, crearAtributo, eliminarAtributo } from '../lib/repositorios/adminAtributosRepo.ts';
import type { TipoAtributo } from '../lib/dominio/tipos.ts';
import { validarAtributo } from '../lib/validacion/atributos.ts';
import { entero, exigirSesion, falla, noEncontrado, publicar, type RespuestaAccion } from './ayudas.ts';

/** Cómo se llama cada lista en los mensajes («Se creó la etiqueta…»). */
const NOMBRE_DEL_TIPO: Record<TipoAtributo, { uno: string; articulo: 'la' | 'el' }> = {
	etiqueta: { uno: 'etiqueta', articulo: 'la' },
	alergeno: { uno: 'alérgeno', articulo: 'el' },
};

/** Etiquetas y alérgenos («Contiene») que se ven en la carta. Cada acción exige sesión por sí misma (ver `exigirSesion`). */
export const atributos = {
	guardarAtributo: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarAtributo(formulario);
			if (!validado.ok) return { ok: false, errores: validado.errores };

			const { tipo, nombreEs, nombreEn } = validado.datos;
			const { uno, articulo } = NOMBRE_DEL_TIPO[tipo];
			const id = entero(formulario, 'id');
			const bd = obtenerBd();

			const resultado = id === undefined ? await crearAtributo(bd, validado.datos) : await actualizarAtributo(bd, id, { nombreEs, nombreEn });
			if (!resultado.ok) {
				return resultado.motivo === 'repetido' ? falla('nombreEs', `Ya existe ${articulo === 'la' ? 'una' : 'un'} ${uno} con ese nombre.`) : noEncontrado(`${articulo === 'la' ? 'La' : 'El'} ${uno}`);
			}
			return publicar(contexto, id === undefined ? `Se creó ${articulo} ${uno} «${nombreEs}».` : `Cambios guardados en «${nombreEs}».`);
		},
	}),

	eliminarAtributo: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			if (id === undefined) return noEncontrado('El elemento');

			const resultado = await eliminarAtributo(obtenerBd(), id);
			if (!resultado.ok) return noEncontrado('El elemento');

			const { productos } = resultado;
			const quitado = productos === 0 ? '' : ` Se quitó de ${productos} ${productos === 1 ? 'producto' : 'productos'}.`;
			return publicar(contexto, `Eliminado.${quitado}`);
		},
	}),
};
