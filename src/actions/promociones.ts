import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import {
	actualizarPromocion,
	crearPromocion,
	eliminarPromocion,
	establecerPromocionActiva,
	guardarMenuDia,
	moverPromocion,
	obtenerPromocion,
} from '../lib/repositorios/adminPromosRepo.ts';
import { validarMenuDia, validarPromocion } from '../lib/validacion/promociones.ts';
import { cadena } from '../lib/validacion/comun.ts';
import { leerImagen, urlsAEliminar } from '../lib/validacion/imagenFormulario.ts';
import {
	CAMPOS_IMAGEN,
	borrarArchivos,
	entero,
	exigirSesion,
	noEncontrado,
	publicar,
	reconoceFoto,
	verificaSubida,
	valoresDe,
	type RespuestaAccion,
} from './ayudas.ts';

const CAMPOS_PROMOCION = ['id', 'tituloEs', 'tituloEn', 'descripcionEs', 'descripcionEn', 'precio', 'activa', 'desde', 'hasta', ...CAMPOS_IMAGEN];
const CAMPOS_MENU = ['tituloEs', 'tituloEn', 'descripcionEs', 'descripcionEn', 'precio', 'fecha', 'activo'];

/** Promociones y menú del día. Cada acción exige sesión por sí misma (ver `exigirSesion`). */
export const promocionesYMenu = {
	guardarPromocion: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			const actual = id === undefined ? undefined : await obtenerPromocion(bd, id);
			if (id !== undefined && !actual) return noEncontrado('La promoción');

			// Los errores de la promoción y de la foto se informan juntos.
			const validado = validarPromocion(formulario);
			const foto = leerImagen(formulario, {
				actual: actual?.imagen ?? null,
				reconoce: reconoceFoto,
				verifica: verificaSubida,
				altPorDefecto: cadena(formulario, 'tituloEs'),
			});
			if (!validado.ok || !foto.ok) {
				const errores = { ...(validado.ok ? {} : validado.errores), ...(foto.ok ? {} : foto.errores) };
				return { ok: false, errores, valores: valoresDe(formulario, CAMPOS_PROMOCION) };
			}

			const datos = { ...validado.datos, imagen: foto.datos.imagen };
			if (!actual) {
				await crearPromocion(bd, datos);
				return publicar(contexto, 'Promoción creada.');
			}
			await actualizarPromocion(bd, actual.id, datos);
			await borrarArchivos(urlsAEliminar(actual.imagen, foto.datos.imagen));
			return publicar(contexto, 'Promoción guardada.');
		},
	}),

	/** Estado explícito (no «alternar»), igual que el agotado de los productos. */
	establecerPromocionActiva: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const activa = formulario.get('activa');
			if (id === undefined || (activa !== 'true' && activa !== 'false')) return noEncontrado('La promoción');

			if (!(await establecerPromocionActiva(obtenerBd(), id, activa === 'true'))) return noEncontrado('La promoción');
			return publicar(contexto, activa === 'true' ? 'Promoción activada.' : 'Promoción desactivada.');
		},
	}),

	moverPromocion: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const direccion = formulario.get('direccion');
			if (id === undefined || (direccion !== 'arriba' && direccion !== 'abajo')) return noEncontrado('La promoción');

			const movida = await moverPromocion(obtenerBd(), id, direccion);
			return movida ? publicar(contexto, 'Orden actualizado.') : { ok: true, mensaje: 'Ya está en el extremo de la lista.' };
		},
	}),

	eliminarPromocion: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			const promocion = id === undefined ? undefined : await obtenerPromocion(bd, id);
			if (!promocion || !(await eliminarPromocion(bd, promocion.id))) return noEncontrado('La promoción');

			await borrarArchivos(urlsAEliminar(promocion.imagen, null));
			return publicar(contexto, 'Promoción eliminada.');
		},
	}),

	guardarMenuDia: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarMenuDia(formulario);
			if (!validado.ok) return { ...validado, valores: valoresDe(formulario, CAMPOS_MENU) };

			await guardarMenuDia(obtenerBd(), validado.datos);
			return publicar(contexto, 'Menú del día guardado.');
		},
	}),
};
