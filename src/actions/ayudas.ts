import { ActionError, type ActionAPIContext } from 'astro:actions';
import { ISR_BYPASS_TOKEN, SESSION_SECRET } from 'astro:env/server';
import { verificarSubida, type SubidaFirmada } from '../lib/almacenamiento/firma.ts';
import { obtenerAlmacen } from '../lib/almacenamiento/index.ts';
import { obtenerBd } from '../lib/db/index.ts';
import { urlsSinUso } from '../lib/repositorios/referenciasFotos.ts';
import { revalidar } from '../lib/revalidar.ts';

export type RespuestaAccion =
	| { ok: true; mensaje: string }
	| { ok: false; errores: Record<string, string>; /** Lo que la persona escribió, para no perderlo al corregir. */ valores?: Record<string, string[]> };

export const CAMPOS_IMAGEN = ['imagen', 'imagenAltEs', 'imagenAltEn', 'quitarImagen'];
export const CAMPOS_PRODUCTO = ['id', 'categoriaId', 'nombreEs', 'nombreEn', 'descripcionEs', 'descripcionEn', 'precio', 'alergenos', 'etiquetas', 'disponible', 'destacado', 'visible', ...CAMPOS_IMAGEN];
export const CAMPOS_CATEGORIA = ['id', 'nombreEs', 'nombreEn', 'visible'];
// Mayor que el máximo de cualquier campo (600): recortar aquí haría perder texto al corregir un error.
const LARGO_MAXIMO_VALOR = 1000;
const VALORES_MAXIMOS_POR_CAMPO = 12;

/**
 * Devuelve solo los campos conocidos, acotados, para volver a mostrar el formulario si hay errores. Se arma con un Map: el nombre
 * del campo lo elige el cliente y un objeto plano fallaría con claves como «__proto__». Además el resultado puede viajar en una cookie.
 */
export function valoresDe(formulario: FormData, camposConocidos: string[]): Record<string, string[]> {
	const valores = new Map<string, string[]>();
	for (const [clave, valor] of formulario.entries()) {
		if (typeof valor !== 'string' || !camposConocidos.includes(clave)) continue;
		const lista = valores.get(clave) ?? [];
		if (lista.length < VALORES_MAXIMOS_POR_CAMPO) lista.push(valor.slice(0, LARGO_MAXIMO_VALOR));
		valores.set(clave, lista);
	}
	return Object.fromEntries(valores);
}

export const falla = (campo: string, mensaje: string): RespuestaAccion => ({ ok: false, errores: { [campo]: mensaje } });

/** Las Actions no pasan por la protección de rutas del middleware (viven en /_actions): cada una exige sesión. */
export function exigirSesion(contexto: ActionAPIContext): void {
	if (!contexto.locals.haySesion) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Tu sesión venció. Vuelve a ingresar.' });
}

/** Refresca la carta pública tras guardar. Un fallo aquí no deshace el cambio: solo se avisa. */
export async function publicar(contexto: ActionAPIContext, mensaje: string): Promise<RespuestaAccion> {
	const resultado = await revalidar({ sitio: contexto.site?.origin ?? '', token: ISR_BYPASS_TOKEN });
	if (resultado.ok) return { ok: true, mensaje };
	return { ok: true, mensaje: `${mensaje} La carta pública puede tardar hasta una hora en mostrar el cambio.` };
}

export const entero = (formulario: FormData, clave: string): number | undefined => {
	const valor = formulario.get(clave);
	return typeof valor === 'string' && /^\d{1,9}$/.test(valor) && Number(valor) > 0 ? Number(valor) : undefined;
};

export const noEncontrado = (que: string): RespuestaAccion => falla('formulario', `${que} ya no existe. Recarga la página.`);

/** ¿Esta URL es una foto de nuestro almacén? Impide guardar enlaces a otros sitios como si fueran fotos. */
export const reconoceFoto = (url: string): boolean => obtenerAlmacen().reconoce(url);

/** ¿La subida trae la firma que emitió este servidor? Sin ella no se acepta, aunque la URL tenga forma válida. */
export const verificaSubida = (subida: SubidaFirmada): boolean => (SESSION_SECRET ? verificarSubida(SESSION_SECRET, subida) : false);

/**
 * Borra del almacén las fotos que ya no se usan. Antes comprueba que ningún otro producto, promoción o foto de la
 * galería siga usándolas. Nunca debe deshacer un cambio ya guardado: si falla, solo queda
 * un archivo huérfano (se registra en el servidor).
 */
export async function borrarArchivos(urls: string[]): Promise<void> {
	const almacen = obtenerAlmacen();
	const sinUso = await urlsSinUso(obtenerBd(), urls);
	await Promise.all(
		sinUso.map((url) =>
			almacen.eliminar(url).catch((error: unknown) => console.error('[fotos] no se pudo borrar un archivo huérfano', url, error)),
		),
	);
}
