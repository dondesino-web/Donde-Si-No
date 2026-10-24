export type DecisionAcceso = 'permitir' | 'login' | 'no-autorizado' | 'panel';

const RUTA_LOGIN = '/admin/login';
const RUTA_PROTEGIDA_POR_DEFECTO = '/admin';
// Astro decodifica la ruta antes de elegir la página: aquí se hace lo mismo (incluida la doble codificación).
const MAX_DECODIFICACIONES = 3;

function decodificar(ruta: string): string {
	let actual = ruta;
	for (let i = 0; i < MAX_DECODIFICACIONES; i++) {
		const siguiente = decodeURIComponent(actual);
		if (siguiente === actual) return actual;
		actual = siguiente;
	}
	return actual;
}

/**
 * Normaliza como lo haría el servidor, para que `/ADMIN//x`, `/%61dmin` o `/admin/../admin/x` no esquiven la protección.
 * Si la codificación es inválida no se puede saber a dónde apunta: se trata como el panel (falla cerrado).
 */
function normalizar(ruta: string): string {
	let decodificada: string;
	try {
		decodificada = decodificar(ruta);
	} catch {
		return RUTA_PROTEGIDA_POR_DEFECTO;
	}

	const segmentos: string[] = [];
	for (const segmento of decodificada.toLowerCase().replaceAll('\\', '/').split('/')) {
		if (segmento === '' || segmento === '.') continue;
		if (segmento === '..') segmentos.pop();
		else segmentos.push(segmento);
	}
	return `/${segmentos.join('/')}`;
}

const esRutaDe = (ruta: string, base: string): boolean => ruta === base || ruta.startsWith(`${base}/`);

/** ¿La ruta pertenece al panel o a su API? Sirve también para marcar sus respuestas como no cacheables. */
export function esRutaPanel(rutaOriginal: string): boolean {
	const ruta = normalizar(rutaOriginal);
	return esRutaDe(ruta, '/admin') || esRutaDe(ruta, '/api/admin');
}

/** Decide qué hacer con una petición según su ruta y si trae una sesión válida. */
export function decidirAcceso(rutaOriginal: string, haySesion: boolean): DecisionAcceso {
	const ruta = normalizar(rutaOriginal);

	// Ninguna acción es pública: sin sesión se corta aquí, aunque una acción nueva olvide su propia guardia (`exigirSesion`).
	if (esRutaDe(ruta, '/api/admin') || esRutaDe(ruta, '/_actions')) return haySesion ? 'permitir' : 'no-autorizado';
	if (!esRutaDe(ruta, '/admin')) return 'permitir';
	if (ruta === RUTA_LOGIN) return haySesion ? 'panel' : 'permitir';
	return haySesion ? 'permitir' : 'login';
}
