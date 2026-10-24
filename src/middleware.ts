import { SESSION_SECRET } from 'astro:env/server';
import { defineMiddleware } from 'astro:middleware';
import { decidirAcceso, esRutaPanel } from './lib/auth/acceso.ts';
import { nombreCookieSesion, verificarTokenSesion } from './lib/auth/sesion.ts';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

/**
 * Cabeceras de seguridad para todas las respuestas. La CSP es deliberadamente acotada (no restringe scripts ni imágenes):
 * impide que otro sitio incruste la carta, cambiar la base de las URL o enviar formularios a otro origen.
 */
const CABECERAS_DE_SEGURIDAD: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'DENY',
	'Permissions-Policy': 'geolocation=(), microphone=(), payment=()',
	'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
};

function conCabeceras(respuesta: Response): Response {
	for (const [nombre, valor] of Object.entries(CABECERAS_DE_SEGURIDAD)) respuesta.headers.set(nombre, valor);
	return respuesta;
}

export const onRequest = defineMiddleware(async (contexto, siguiente) => {
	// `decidirAcceso` es el único juez: no hay prefiltro que pueda quedar desfasado respecto de Astro.
	const { pathname } = contexto.url;
	const token = contexto.cookies.get(nombreCookieSesion(import.meta.env.PROD))?.value;
	const haySesion = SESSION_SECRET ? verificarTokenSesion(SESSION_SECRET, token, new Date()) : false;
	contexto.locals.haySesion = haySesion;

	switch (decidirAcceso(pathname, haySesion)) {
		case 'login':
			return conCabeceras(new Response(null, { status: 303, headers: { ...SIN_CACHE, Location: '/admin/login' } }));
		case 'panel':
			return conCabeceras(new Response(null, { status: 303, headers: { ...SIN_CACHE, Location: '/admin' } }));
		case 'no-autorizado':
			return conCabeceras(
				new Response(JSON.stringify({ error: 'No autorizado' }), {
					status: 401,
					headers: { ...SIN_CACHE, 'Content-Type': 'application/json' },
				}),
			);
	}

	const respuesta = conCabeceras(await siguiente());
	if (esRutaPanel(pathname)) {
		// El panel nunca se cachea ni se indexa.
		respuesta.headers.set('Cache-Control', 'no-store');
		respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
	return respuesta;
});
