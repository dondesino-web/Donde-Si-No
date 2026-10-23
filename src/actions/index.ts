import { ActionError, defineAction, type ActionAPIContext } from 'astro:actions';
import { ISR_BYPASS_TOKEN } from 'astro:env/server';
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
import { revalidar } from '../lib/revalidar.ts';
import { PRECIO_MAXIMO, parsearPrecio, validarCategoria, validarProducto } from '../lib/validacion/carta.ts';

export type RespuestaAccion =
	| { ok: true; mensaje: string }
	| { ok: false; errores: Record<string, string>; /** Lo que la persona escribió, para no perderlo al corregir. */ valores?: Record<string, string[]> };

const CAMPOS_PRODUCTO = ['id', 'categoriaId', 'nombreEs', 'nombreEn', 'descripcionEs', 'descripcionEn', 'precio', 'alergenos', 'etiquetas', 'disponible', 'destacado', 'visible'];
const CAMPOS_CATEGORIA = ['id', 'nombreEs', 'nombreEn', 'visible'];
const LARGO_MAXIMO_VALOR = 400;
const VALORES_MAXIMOS_POR_CAMPO = 12;

/**
 * Devuelve solo los campos conocidos, acotados, para volver a mostrar el formulario si hay errores. Se arma con un Map: el nombre
 * del campo lo elige el cliente y un objeto plano fallaría con claves como «__proto__». Además el resultado puede viajar en una cookie.
 */
function valoresDe(formulario: FormData, camposConocidos: string[]): Record<string, string[]> {
	const valores = new Map<string, string[]>();
	for (const [clave, valor] of formulario.entries()) {
		if (typeof valor !== 'string' || !camposConocidos.includes(clave)) continue;
		const lista = valores.get(clave) ?? [];
		if (lista.length < VALORES_MAXIMOS_POR_CAMPO) lista.push(valor.slice(0, LARGO_MAXIMO_VALOR));
		valores.set(clave, lista);
	}
	return Object.fromEntries(valores);
}

const falla = (campo: string, mensaje: string): RespuestaAccion => ({ ok: false, errores: { [campo]: mensaje } });

/** Las Actions no pasan por la protección de rutas del middleware (viven en /_actions): cada una exige sesión. */
function exigirSesion(contexto: ActionAPIContext): void {
	if (!contexto.locals.haySesion) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Tu sesión venció. Vuelve a ingresar.' });
}

/** Refresca la carta pública tras guardar. Un fallo aquí no deshace el cambio: solo se avisa. */
async function publicar(contexto: ActionAPIContext, mensaje: string): Promise<RespuestaAccion> {
	const resultado = await revalidar({ sitio: contexto.site?.origin ?? '', token: ISR_BYPASS_TOKEN });
	if (resultado.ok) return { ok: true, mensaje };
	return { ok: true, mensaje: `${mensaje} La carta pública puede tardar hasta una hora en mostrar el cambio.` };
}

const entero = (formulario: FormData, clave: string): number | undefined => {
	const numero = Number(formulario.get(clave));
	return Number.isInteger(numero) && numero > 0 ? numero : undefined;
};

const noEncontrado = (que: string): RespuestaAccion => falla('formulario', `${que} ya no existe. Recarga la página.`);

export const server = {
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
