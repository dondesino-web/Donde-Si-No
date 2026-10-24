import type { APIRoute } from 'astro';
import { SESSION_SECRET } from 'astro:env/server';
import { firmarSubida } from '../../../lib/almacenamiento/firma.ts';
import { LIMITES_FOTO, validarFotos } from '../../../lib/almacenamiento/validarFoto.ts';
import { obtenerAlmacen } from '../../../lib/almacenamiento/index.ts';

// El middleware ya exige sesión en /api/admin/*; `checkOrigin` rechaza envíos de otro origen.
export const prerender = false;

/** Margen para la cabecera multipart sobre las dos fotos. */
const MARGEN_CUERPO = 64 * 1024;
const CUERPO_MAXIMO = LIMITES_FOTO.bytesGrande + LIMITES_FOTO.bytesChica + MARGEN_CUERPO;

const respuesta = (cuerpo: Record<string, unknown>, status: number): Response =>
	new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const archivoDe = (formulario: FormData, campo: string): File | undefined => {
	const valor = formulario.get(campo);
	return valor instanceof File ? valor : undefined;
};

/**
 * Recibe las dos versiones de una foto (`sm` y `lg`, ya comprimidas a WebP por el navegador), las valida por sus bytes
 * y las guarda. Devuelve las URLs y las dimensiones para ponerlas en el formulario; la foto solo queda asociada a un
 * producto, promoción o galería cuando se guarda ese formulario.
 */
export const POST: APIRoute = async ({ request }) => {
	const declarado = Number(request.headers.get('content-length'));
	if (Number.isFinite(declarado) && declarado > CUERPO_MAXIMO) return respuesta({ error: 'La foto es demasiado pesada (máximo 1,5 MB).' }, 413);

	let formulario: FormData;
	try {
		formulario = await request.formData();
	} catch {
		return respuesta({ error: 'No se pudo leer la foto enviada.' }, 400);
	}

	const chica = archivoDe(formulario, 'sm');
	const grande = archivoDe(formulario, 'lg');
	if (!chica || !grande) return respuesta({ error: 'Faltan las dos versiones de la foto.' }, 400);
	// El tamaño real (no el declarado en la cabecera) se comprueba antes de leer el contenido a memoria.
	if (chica.size > LIMITES_FOTO.bytesChica || grande.size > LIMITES_FOTO.bytesGrande) {
		return respuesta({ error: 'La foto es demasiado pesada (máximo 1,5 MB).' }, 413);
	}
	if (!SESSION_SECRET) return respuesta({ error: 'El panel no está configurado.' }, 503);

	const [bytesChica, bytesGrande] = await Promise.all([chica, grande].map(async (a) => new Uint8Array(await a.arrayBuffer())));
	const validacion = validarFotos(bytesChica, bytesGrande);
	if (!validacion.ok) return respuesta({ error: validacion.error }, 422);

	const almacen = obtenerAlmacen();
	const subidaChica = await almacen.subir(bytesChica);
	try {
		const subidaGrande = await almacen.subir(bytesGrande);
		const subida = { sm: subidaChica.url, lg: subidaGrande.url, ancho: validacion.ancho, alto: validacion.alto };
		// La firma garantiza que al guardar el formulario solo se acepten fotos que este servidor emitió.
		return respuesta({ ...subida, firma: firmarSubida(SESSION_SECRET, subida) }, 200);
	} catch (error) {
		// No dejar una mitad huérfana en el almacén.
		await almacen.eliminar(subidaChica.url).catch((fallo: unknown) => console.error('[fotos] no se pudo limpiar la subida parcial', fallo));
		throw error;
	}
};
