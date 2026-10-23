import { EVENTOS_ESTADISTICA, type EventoEstadistica } from '../dominio/tipos.ts';

/**
 * Eventos que puede enviar el navegador. `qr_escaneo` no está: solo la ruta `/qr` lo registra, para que nadie
 * (ni un script suelto) pueda inflar los escaneos desde la página.
 */
export const EVENTOS_PUBLICOS: readonly EventoEstadistica[] = EVENTOS_ESTADISTICA.filter((evento) => evento !== 'qr_escaneo');

const LARGO_MAXIMO_CUERPO = 64;

/** El cuerpo del beacon es el nombre del evento y nada más. Devuelve `undefined` ante cualquier otra cosa. */
export function leerEventoPublico(cuerpo: string): EventoEstadistica | undefined {
	if (cuerpo.length > LARGO_MAXIMO_CUERPO) return undefined;
	const texto = cuerpo.trim();
	return EVENTOS_PUBLICOS.find((evento) => evento === texto);
}

/**
 * Robots, rastreadores, previsualizaciones de enlaces y herramientas de línea de comandos: no son personas.
 * Un visitante sin identificación también se descarta. No es infalible: las estadísticas son aproximadas.
 */
const PATRON_BOT =
	/bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|whatsapp|curl|wget|python|node-fetch|go-http-client|axios|java\/|playwright|puppeteer|selenium|phantomjs/i;

export function esBot(agente: string | null | undefined): boolean {
	return !agente || PATRON_BOT.test(agente);
}

/**
 * ¿La petición viene de nuestro propio sitio? Se exige el `Origin` exacto; si el navegador no lo envía, se acepta solo
 * cuando declara `Sec-Fetch-Site: same-origin`. Un `Origin` ajeno nunca se compensa con otra cabecera.
 */
export function esMismoOrigen(cabeceras: Headers, origenDelServidor: string): boolean {
	const origen = cabeceras.get('origin');
	if (origen !== null) return origen === origenDelServidor;
	return cabeceras.get('sec-fetch-site') === 'same-origin';
}

/** Nombres con los que el panel muestra cada evento. */
export const ETIQUETA_EVENTO: Record<EventoEstadistica, string> = {
	visita: 'Visitas',
	qr_escaneo: 'Escaneos del QR',
	clic_llamar: 'Llamar',
	clic_mapa: 'Cómo llegar',
	clic_resena: 'Reseña',
	clic_ubereats: 'Uber Eats',
	clic_compartir: 'Compartir',
	idioma_en: 'Inglés',
};

/** Los eventos que son un clic en una acción de la carta (todo menos visitas, escaneos e idioma). */
export const EVENTOS_DE_CLIC: readonly EventoEstadistica[] = EVENTOS_ESTADISTICA.filter((evento) => evento.startsWith('clic_'));
