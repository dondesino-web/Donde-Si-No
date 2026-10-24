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
	obtenerProducto,
	moverCategoria,
	moverProducto,
} from '../lib/repositorios/adminCartaRepo.ts';
import {
	CAMPOS_CATEGORIA,
	CAMPOS_PRODUCTO,
	entero,
	exigirSesion,
	falla,
	noEncontrado,
	publicar,
	borrarArchivos,
	reconoceFoto,
	verificaSubida,
	valoresDe,
	type RespuestaAccion,
} from './ayudas.ts';
import { cargaRapida } from './cargaRapida.ts';
import { datosDeFotos } from './fotos.ts';
import { datosDelLocal } from './local.ts';
import { planilla } from './planilla.ts';
import { promocionesYMenu } from './promociones.ts';
import { cadena } from '../lib/validacion/comun.ts';
import { leerImagen, urlsAEliminar } from '../lib/validacion/imagenFormulario.ts';
import { PRECIO_MAXIMO, parsearPrecio, validarCategoria, validarProducto } from '../lib/validacion/carta.ts';


export const server = {
	...promocionesYMenu,
	...datosDelLocal,
	...datosDeFotos,
	...cargaRapida,
	...planilla,

	guardarProducto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			const actual = id === undefined ? undefined : await obtenerProducto(bd, id);
			if (id !== undefined && !actual) return noEncontrado('El producto');

			// Los errores del producto y de la foto se informan juntos.
			const validado = validarProducto(formulario);
			const foto = leerImagen(formulario, {
				actual: actual?.imagen ?? null,
				reconoce: reconoceFoto,
				verifica: verificaSubida,
				altPorDefecto: cadena(formulario, 'nombreEs'),
			});
			if (!validado.ok || !foto.ok) {
				const errores = { ...(validado.ok ? {} : validado.errores), ...(foto.ok ? {} : foto.errores) };
				return { ok: false, errores, valores: valoresDe(formulario, CAMPOS_PRODUCTO) };
			}

			const datos = { ...validado.datos, imagen: foto.datos.imagen };
			if (!actual) {
				await crearProducto(bd, datos);
				return publicar(contexto, 'Producto creado.');
			}
			await actualizarProducto(bd, actual.id, datos);
			await borrarArchivos(urlsAEliminar(actual.imagen, foto.datos.imagen));
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

			const movido = await moverProducto(obtenerBd(), id, direccion);
			return movido ? publicar(contexto, 'Orden actualizado.') : { ok: true, mensaje: 'Ya está en el extremo de la lista.' };
		},
	}),

	eliminarProducto: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const bd = obtenerBd();
			const id = entero(formulario, 'id');
			const producto = id === undefined ? undefined : await obtenerProducto(bd, id);
			if (!producto || !(await eliminarProducto(bd, producto.id))) return noEncontrado('El producto');

			await borrarArchivos(urlsAEliminar(producto.imagen, null));
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

			const movida = await moverCategoria(obtenerBd(), id, direccion);
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
