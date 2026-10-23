import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import {
	actualizarCategoria,
	actualizarProducto,
	cambiarPrecio,
	crearCategoria,
	crearProducto,
	eliminarCategoria,
	eliminarProducto,
	establecerDisponible,
	moverCategoria,
	moverProducto,
	type Direccion,
} from '../lib/repositorios/adminCartaRepo.ts';
import {
	CAMPOS_CATEGORIA,
	CAMPOS_PRODUCTO,
	entero,
	exigirSesion,
	falla,
	noEncontrado,
	publicar,
	valoresDe,
	type RespuestaAccion,
} from './ayudas.ts';
import { datosDelLocal } from './local.ts';
import { promocionesYMenu } from './promociones.ts';
import { PRECIO_MAXIMO, parsearPrecio, validarCategoria, validarProducto } from '../lib/validacion/carta.ts';


export const server = {
	...promocionesYMenu,
	...datosDelLocal,

	guardarProducto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarProducto(formulario);
			if (!validado.ok) return { ...validado, valores: valoresDe(formulario, CAMPOS_PRODUCTO) };

			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			if (id === undefined) {
				await crearProducto(bd, validado.datos);
				return publicar(contexto, 'Producto creado.');
			}
			if (!(await actualizarProducto(bd, id, validado.datos))) return noEncontrado('El producto');
			return publicar(contexto, 'Cambios guardados.');
		},
	}),

	cambiarPrecio: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const precio = parsearPrecio(String(formulario.get('precio') ?? ''));
			if (id === undefined) return noEncontrado('El producto');
			if (precio === undefined) {
				return falla('precio', `El precio debe ser solo números, hasta ${PRECIO_MAXIMO.toLocaleString('es-CL')} (por ejemplo 4500 o 4.500).`);
			}

			if (!(await cambiarPrecio(obtenerBd(), id, precio))) return noEncontrado('El producto');
			return publicar(contexto, precio === null ? 'Precio quitado: se mostrará «Consultar».' : 'Precio actualizado.');
		},
	}),

	/** Recibe el estado deseado (no «alternar»): tocar dos veces o reintentar nunca deja el estado al revés. */
	establecerDisponible: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const disponible = formulario.get('disponible');
			if (id === undefined || (disponible !== 'true' && disponible !== 'false')) return noEncontrado('El producto');

			if (!(await establecerDisponible(obtenerBd(), id, disponible === 'true'))) return noEncontrado('El producto');
			return publicar(contexto, disponible === 'true' ? 'Marcado como disponible.' : 'Marcado como agotado.');
		},
	}),

	moverProducto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const direccion = formulario.get('direccion');
			if (id === undefined || (direccion !== 'arriba' && direccion !== 'abajo')) return noEncontrado('El producto');

			const movido = await moverProducto(obtenerBd(), id, direccion as Direccion);
			return movido ? publicar(contexto, 'Orden actualizado.') : { ok: true, mensaje: 'Ya está en el extremo de la lista.' };
		},
	}),

	eliminarProducto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			if (id === undefined || !(await eliminarProducto(obtenerBd(), id))) return noEncontrado('El producto');
			return publicar(contexto, 'Producto eliminado.');
		},
	}),

	guardarCategoria: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const validado = validarCategoria(formulario);
			if (!validado.ok) return { ...validado, valores: valoresDe(formulario, CAMPOS_CATEGORIA) };

			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			if (id === undefined) {
				await crearCategoria(bd, validado.datos);
				return publicar(contexto, 'Categoría creada.');
			}
			if (!(await actualizarCategoria(bd, id, validado.datos))) return noEncontrado('La categoría');
			return publicar(contexto, 'Categoría guardada.');
		},
	}),

	moverCategoria: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			const direccion = formulario.get('direccion');
			if (id === undefined || (direccion !== 'arriba' && direccion !== 'abajo')) return noEncontrado('La categoría');

			const movida = await moverCategoria(obtenerBd(), id, direccion as Direccion);
			return movida ? publicar(contexto, 'Orden actualizado.') : { ok: true, mensaje: 'Ya está en el extremo de la lista.' };
		},
	}),

	eliminarCategoria: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const id = entero(formulario, 'id');
			if (id === undefined) return noEncontrado('La categoría');

			const resultado = await eliminarCategoria(obtenerBd(), id);
			if (resultado.ok) return publicar(contexto, 'Categoría eliminada.');
			return resultado.motivo === 'tiene-productos'
				? falla('formulario', 'No se puede eliminar una categoría que todavía tiene productos. Elimínalos o muévelos primero.')
				: noEncontrado('La categoría');
		},
	}),
};
