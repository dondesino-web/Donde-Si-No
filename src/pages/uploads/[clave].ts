import type { APIRoute } from 'astro';
import { obtenerAlmacen } from '../../lib/almacenamiento/index.ts';

// Solo sirve las fotos del almacén local (desarrollo y pruebas). En producción las fotos van por Vercel Blob y esta ruta responde 404.
export const prerender = false;

const noEncontrada = (): Response => new Response('No encontrada', { status: 404 });

export const GET: APIRoute = async ({ params }) => {
	let datos: Uint8Array<ArrayBuffer> | undefined;
	try {
		datos = await obtenerAlmacen().leer?.(params.clave ?? '');
	} catch {
		// Producción sin almacén local (o sin token): no hay nada que servir desde aquí.
		return noEncontrada();
	}
	if (!datos) return noEncontrada();

	return new Response(datos, {
		headers: {
			'Content-Type': 'image/webp',
			// La clave es un UUID nuevo en cada subida: el contenido nunca cambia.
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff',
		},
	});
};
