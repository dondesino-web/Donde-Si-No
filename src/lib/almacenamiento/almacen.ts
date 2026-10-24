import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { del, list, put } from '@vercel/blob';

export interface ArchivoAlmacenado {
	url: string;
	/** Cuándo se subió: la limpieza solo toca archivos con más de un día. */
	subidoEn: Date;
}

export interface ImagenSubida {
	clave: string;
	url: string;
}

/** Guarda las fotos de la carta. El navegador ya las comprimió a WebP y el servidor las validó. */
export interface AlmacenImagenes {
	readonly tipo: 'local' | 'blob';
	subir(datos: Uint8Array): Promise<ImagenSubida>;
	eliminar(url: string): Promise<void>;
	/** ¿Es esta URL una foto de la carta guardada en este almacén? Nada de otros sitios ni de otros archivos. */
	reconoce(url: string): boolean;
	/**
	 * Solo el almacén local: lee una foto por su clave para servirla desde una ruta propia (`/uploads/<clave>`).
	 * Escribir en `public/` haría que Vite recargue todas las páginas abiertas en desarrollo.
	 */
	leer?(clave: string): Promise<Uint8Array<ArrayBuffer> | undefined>;
	/** Todas las fotos de la carta que hay en el almacén (para limpiar las que ningún registro usa). */
	listar?(): Promise<ArchivoAlmacenado[]>;
}

export interface ConfigAlmacenLocal {
	directorio: string;
	urlBase: string;
}

const TIPO_CONTENIDO = 'image/webp';
const UN_ANO_EN_SEGUNDOS = 60 * 60 * 24 * 365;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CLAVE_VALIDA = new RegExp(`^${UUID}\\.webp$`);
const CARPETA_BLOB = 'carta';
const RUTA_BLOB_VALIDA = new RegExp(`^/${CARPETA_BLOB}/${UUID}\\.webp$`);
const SUFIJO_HOST_BLOB = '.public.blob.vercel-storage.com';

const nuevaClave = (): string => `${randomUUID()}.webp`;
const urlInvalida = (): Error => new Error('URL de imagen no válida');

/** Solo para desarrollo: guarda en una carpeta local que sirve la ruta `/uploads/[clave]`. */
export function crearAlmacenLocal({ directorio, urlBase }: ConfigAlmacenLocal): AlmacenImagenes {
	const prefijo = `${urlBase}/`;
	// Solo se aceptan claves generadas por `subir`: impide salir del directorio (path traversal).
	const claveDe = (url: string): string => (url.startsWith(prefijo) ? url.slice(prefijo.length) : '');

	return {
		tipo: 'local',
		reconoce: (url) => CLAVE_VALIDA.test(claveDe(url)),
		async listar() {
			let nombres: string[];
			try {
				nombres = await readdir(directorio);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
				throw error;
			}
			// Solo las claves que generó `subir`: cualquier otro archivo de la carpeta no es nuestro.
			const propias = nombres.filter((nombre) => CLAVE_VALIDA.test(nombre));
			return Promise.all(propias.map(async (nombre) => ({ url: `${prefijo}${nombre}`, subidoEn: (await stat(join(directorio, nombre))).mtime })));
		},
		async leer(clave) {
			if (!CLAVE_VALIDA.test(clave)) return undefined;
			try {
				return new Uint8Array(await readFile(join(directorio, clave)));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
				throw error;
			}
		},
		async subir(datos) {
			const clave = nuevaClave();
			await mkdir(directorio, { recursive: true });
			await writeFile(join(directorio, clave), datos);
			return { clave, url: `${prefijo}${clave}` };
		},
		async eliminar(url) {
			const clave = claveDe(url);
			if (!CLAVE_VALIDA.test(clave)) throw urlInvalida();
			await rm(join(directorio, clave), { force: true });
		},
	};
}

/** El token de Vercel Blob lleva el identificador del store: `vercel_blob_rw_<storeId>_<secreto>`. */
const storeIdDelToken = (token: string): string | undefined => /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token)?.[1]?.toLowerCase();

/**
 * Solo fotos de la carta subidas por `subir`: https, de NUESTRO store (el host sale del token; otra cuenta de Vercel Blob
 * no vale), sin puerto, usuario ni consulta, y de la carpeta de la carta.
 */
function esFotoDeLaCarta(url: string, token: string): boolean {
	const destino = URL.parse(url);
	if (destino?.protocol !== 'https:' || destino.port || destino.username || destino.password || destino.search || destino.hash) return false;

	const storeId = storeIdDelToken(token);
	const hostValido = storeId ? destino.hostname === `${storeId}${SUFIJO_HOST_BLOB}` : destino.hostname.endsWith(SUFIJO_HOST_BLOB);
	return hostValido && RUTA_BLOB_VALIDA.test(destino.pathname);
}

export function crearAlmacenBlob({ token }: { token: string }): AlmacenImagenes {
	return {
		tipo: 'blob',
		reconoce: (url) => esFotoDeLaCarta(url, token),
		async listar() {
			const archivos: ArchivoAlmacenado[] = [];
			let cursor: string | undefined;
			do {
				const pagina = await list({ prefix: `${CARPETA_BLOB}/`, token, cursor });
				for (const blob of pagina.blobs) {
					// Solo las fotos con el nombre que genera `subir`: nunca otros archivos del store.
					if (RUTA_BLOB_VALIDA.test(`/${blob.pathname}`)) archivos.push({ url: blob.url, subidoEn: blob.uploadedAt });
				}
				cursor = pagina.hasMore ? pagina.cursor : undefined;
			} while (cursor);
			return archivos;
		},
		async subir(datos) {
			const resultado = await put(`${CARPETA_BLOB}/${nuevaClave()}`, Buffer.from(datos), {
				access: 'public',
				contentType: TIPO_CONTENIDO,
				token,
				addRandomSuffix: false,
				allowOverwrite: false,
				// Cada foto tiene una URL nueva, así que puede cachearse para siempre.
				cacheControlMaxAge: UN_ANO_EN_SEGUNDOS,
			});
			return { clave: resultado.pathname, url: resultado.url };
		},
		async eliminar(url) {
			// Nunca otros archivos del store.
			if (!esFotoDeLaCarta(url, token)) throw urlInvalida();
			await del(url, { token });
		},
	};
}

export interface OpcionesElegirAlmacen {
	blobToken: string | undefined;
	esProduccion: boolean;
	local: ConfigAlmacenLocal;
}

export function elegirAlmacen({ blobToken, esProduccion, local }: OpcionesElegirAlmacen): AlmacenImagenes {
	if (blobToken) return crearAlmacenBlob({ token: blobToken });
	if (esProduccion) {
		throw new Error('Falta BLOB_READ_WRITE_TOKEN: en producción las fotos se guardan en Vercel Blob.');
	}
	return crearAlmacenLocal(local);
}
