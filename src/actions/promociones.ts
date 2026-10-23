import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import {
	actualizarPromocion,
	crearPromocion,
	eliminarPromocion,
	establecerPromocionActiva,
	guardarMenuDia,
	moverPromocion,
} from '../lib/repositorios/adminPromosRepo.ts';
import { validarMenuDia, validarPromocion } from '../lib/validacion/promociones.ts';
import { entero, exigirSesion, noEncontrado, publicar, valoresDe, type RespuestaAccion } from './ayudas.ts';

const CAMPOS_PROMOCION = ['id', 'tituloEs', 'tituloEn', 'descripcionEs', 'descripcionEn', 'precio', 'activa', 'desde', 'hasta'];
const CAMPOS_MENU = ['tituloEs', 'tituloEn', 'descripcionEs', 'descripcionEn', 'precio', 'fecha', 'activo'];

/** Promociones y menú del día. Cada acción exige sesión por sí misma (ver `exigirSesion`). */
export const promocionesYMenu = {
	guardarPromocion: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarPromocion(formulario);
			if (!validado.ok) return { ...validado, valores: valoresDe(formulario, CAMPOS_PROMOCION) };

			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			if (id === undefined) {
				await crearPromocion(bd, validado.datos);
				return publicar(contexto, 'Promoción creada.');
			}
			if (!(await actualizarPromocion(bd, id, validado.datos))) return noEncontrado('La promoción');
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
			const id = entero(formulario, 'id');
			if (id === undefined || !(await eliminarPromocion(obtenerBd(), id))) return noEncontrado('La promoción');
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
