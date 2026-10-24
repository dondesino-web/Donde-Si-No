import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { crearFoto, eliminarFoto, MAX_FOTOS, moverFoto } from '../lib/repositorios/adminFotosRepo.ts';
import { leerImagen, urlsAEliminar } from '../lib/validacion/imagenFormulario.ts';
import {
	CAMPOS_IMAGEN,
	borrarArchivos,
	entero,
	exigirSesion,
	falla,
	noEncontrado,
	publicar,
	reconoceFoto,
	verificaSubida,
	valoresDe,
	type RespuestaAccion,
} from './ayudas.ts';

/** Galería de fotos destacadas de la carta. Cada acción exige sesión por sí misma (ver `exigirSesion`). */
export const datosDeFotos = {
	agregarFoto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			// En la galería la foto es obligatoria y el texto alternativo también (no hay un nombre del que sacarlo).
			const foto = leerImagen(formulario, { actual: null, reconoce: reconoceFoto, verifica: verificaSubida, altPorDefecto: '' });
			if (!foto.ok) return { ...foto, valores: valoresDe(formulario, CAMPOS_IMAGEN) };
			if (!foto.datos.imagen) return { ok: false, errores: { imagen: 'Elige una foto antes de agregarla.' } };

			const resultado = await crearFoto(obtenerBd(), foto.datos.imagen);
			if (!resultado.ok) {
				// La foto ya estaba subida pero no se usará: se borra para no dejarla huérfana.
				await borrarArchivos(urlsAEliminar(foto.datos.imagen, null));
				return falla('formulario', `Ya tienes ${MAX_FOTOS} fotos. Elimina una para agregar otra.`);
			}
			return publicar(contexto, 'Foto agregada.');
		},
	}),

	eliminarFoto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const eliminada = id === undefined ? undefined : await eliminarFoto(obtenerBd(), id);
			if (!eliminada) return noEncontrado('La foto');

			await borrarArchivos(urlsAEliminar(eliminada.imagen, null));
			return publicar(contexto, 'Foto eliminada.');
		},
	}),

	moverFoto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const direccion = formulario.get('direccion');
			if (id === undefined || (direccion !== 'arriba' && direccion !== 'abajo')) return noEncontrado('La foto');

			const movida = await moverFoto(obtenerBd(), id, direccion);
			return movida ? publicar(contexto, 'Orden actualizado.') : { ok: true, mensaje: 'Ya está en el extremo de la lista.' };
		},
	}),
};
