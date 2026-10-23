import { SESSION_SECRET } from 'astro:env/server';
import { defineMiddleware } from 'astro:middleware';
import { decidirAcceso, esRutaPanel } from './lib/auth/acceso.ts';
import { NOMBRE_COOKIE_SESION, verificarTokenSesion } from './lib/auth/sesion.ts';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

export const onRequest = defineMiddleware(async (contexto, siguiente) => {
	// `decidirAcceso` es el único juez: no hay prefiltro que pueda quedar desfasado respecto de Astro.
	const { pathname } = contexto.url;
	const token = contexto.cookies.get(NOMBRE_COOKIE_SESION)?.value;
	const haySesion = SESSION_SECRET ? verificarTokenSesion(SESSION_SECRET, token, new Date()) : false;

	contexto.locals.haySesion = haySesion;

	switch (decidirAcceso(pathname, haySesion)) {
		case 'login':
			return new Response(null, { status: 303, headers: { ...SIN_CACHE, Location: '/admin/login' } });
		case 'panel':
			return new Response(null, { status: 303, headers: { ...SIN_CACHE, Location: '/admin' } });
		case 'no-autorizado':
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 401,
				headers: { ...SIN_CACHE, 'Content-Type': 'application/json' },
			});
	}

	const respuesta = await siguiente();
	if (esRutaPanel(pathname)) {
		// El panel nunca se cachea ni se indexa.
		respuesta.headers.set('Cache-Control', 'no-store');
		respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
	return respuesta;
});
