import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { del, put } from '@vercel/blob';

export interface ImagenSubida {
	clave: string;
	url: string;
}

/** Guarda las fotos de la carta. El navegador ya las comprimió a WebP y el servidor las validó. */
export interface AlmacenImagenes {
	readonly tipo: 'local' | 'blob';
	subir(datos: Uint8Array): Promise<ImagenSubida>;
	eliminar(url: string): Promise<void>;
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

/** Solo para desarrollo: escribe en `public/uploads/`, que Astro sirve directamente. */
export function crearAlmacenLocal({ directorio, urlBase }: ConfigAlmacenLocal): AlmacenImagenes {
	const prefijo = `${urlBase}/`;

	return {
		tipo: 'local',
		async subir(datos) {
			const clave = nuevaClave();
			await mkdir(directorio, { recursive: true });
			await writeFile(join(directorio, clave), datos);
			return { clave, url: `${prefijo}${clave}` };
		},
		async eliminar(url) {
			// Solo se aceptan claves generadas por `subir`: impide salir del directorio (path traversal).
			const clave = url.startsWith(prefijo) ? url.slice(prefijo.length) : '';
			if (!CLAVE_VALIDA.test(clave)) throw urlInvalida();
			await rm(join(directorio, clave), { force: true });
		},
	};
}

export function crearAlmacenBlob({ token }: { token: string }): AlmacenImagenes {
	return {
		tipo: 'blob',
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
			// Solo fotos de la carta subidas por `subir`: nunca otros archivos del store.
			const destino = URL.parse(url);
			const esFotoDeLaCarta =
				destino?.protocol === 'https:' &&
				destino.hostname.endsWith(SUFIJO_HOST_BLOB) &&
				RUTA_BLOB_VALIDA.test(destino.pathname);
			if (!esFotoDeLaCarta) throw urlInvalida();
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
