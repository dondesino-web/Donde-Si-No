/*
 * Service worker del panel (alcance `/admin/`). Su único trabajo es mostrar un aviso claro cuando no hay internet.
 * No guarda páginas del panel ni respuestas: son privadas y deben ser siempre las más recientes.
 */
const CACHE = 'panel-sin-conexion-v1';
const PAGINA_SIN_CONEXION = '/panel-sin-conexion.html';
const LOGO = '/marca/logo-160.webp';

self.addEventListener('install', (evento) => {
	evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([PAGINA_SIN_CONEXION, LOGO])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
	evento.waitUntil(
		caches
			.keys()
			.then((nombres) => Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (evento) => {
	const { request } = evento;
	if (request.mode === 'navigate') {
		evento.respondWith(fetch(request).catch(() => caches.match(PAGINA_SIN_CONEXION)));
	} else if (new URL(request.url).pathname === LOGO) {
		// El logo de la página sin conexión: la red primero, el respaldo si no hay internet.
		evento.respondWith(fetch(request).catch(() => caches.match(LOGO)));
	}
});
