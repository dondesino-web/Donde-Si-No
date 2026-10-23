import { BLOB_READ_WRITE_TOKEN } from 'astro:env/server';
import { elegirAlmacen, type AlmacenImagenes } from './almacen.ts';

let instancia: AlmacenImagenes | undefined;

/** Almacén de fotos de la aplicación: Vercel Blob en producción, disco local en desarrollo. */
export function obtenerAlmacen(): AlmacenImagenes {
	instancia ??= elegirAlmacen({
		blobToken: BLOB_READ_WRITE_TOKEN,
		esProduccion: import.meta.env.PROD,
		local: { directorio: 'public/uploads', urlBase: '/uploads' },
	});
	return instancia;
}
