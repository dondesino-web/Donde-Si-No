import { describe, expect, it } from 'vitest';
import { EVENTOS_PUBLICOS, esBot, esMismoOrigen, leerEventoPublico } from '../../src/lib/estadisticas/eventos.ts';

describe('leerEventoPublico', () => {
	it.each(['visita', 'clic_llamar', 'clic_mapa', 'clic_resena', 'clic_ubereats', 'clic_compartir', 'idioma_en'])('acepta %s', (evento) => {
		expect(leerEventoPublico(evento)).toBe(evento);
	});

	it('tolera espacios y saltos de línea alrededor', () => {
		expect(leerEventoPublico('  visita\n')).toBe('visita');
	});

	it('no deja que el navegador cuente escaneos: solo la ruta /qr los registra', () => {
		expect(EVENTOS_PUBLICOS).not.toContain('qr_escaneo');
		expect(leerEventoPublico('qr_escaneo')).toBeUndefined();
	});

	it.each(['', 'otro', 'VISITA', 'visita;drop table', '{"evento":"visita"}', 'visita visita', 'x'.repeat(5000), '__proto__', 'constructor', 'toString'])(
		'rechaza %j',
		(texto) => {
			expect(leerEventoPublico(texto)).toBeUndefined();
		},
	);
});

describe('esBot', () => {
	it.each([
		'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
		'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
		'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
		'WhatsApp/2.23.20.0 A',
		'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
		'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130.0.0.0 Safari/537.36',
		'curl/8.4.0',
		'python-requests/2.31.0',
		'Mozilla/5.0 (Linux; Android 11; moto g power) Chrome/109 Mobile Safari/537.36 Chrome-Lighthouse',
		'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
		'Wget/1.21',
		'node-fetch/1.0',
		'Go-http-client/2.0',
		'Playwright/1.64.1 (x64; windows 10.0) node/24.20',
		'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130 Safari/537.36 Puppeteer',
		'Mozilla/5.0 (X11; Linux) Selenium/4.0',
		'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1',
	])('detecta el bot %j', (agente) => {
		expect(esBot(agente)).toBe(true);
	});

	it.each([null, undefined, ''])('un visitante sin identificación (%j) se trata como bot', (agente) => {
		expect(esBot(agente)).toBe(true);
	});

	it.each([
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
	])('no marca como bot a un navegador de personas: %s', (agente) => {
		expect(esBot(agente)).toBe(false);
	});
});

describe('esMismoOrigen', () => {
	const ORIGEN = 'https://www.donde-sino.com';
	const cabeceras = (campos: Record<string, string>) => new Headers(campos);

	it('acepta una petición cuyo Origin es el del propio sitio', () => {
		expect(esMismoOrigen(cabeceras({ origin: ORIGEN }), ORIGEN)).toBe(true);
	});

	it('sin Origin acepta solo si el navegador declara que es del mismo origen', () => {
		expect(esMismoOrigen(cabeceras({ 'sec-fetch-site': 'same-origin' }), ORIGEN)).toBe(true);
		expect(esMismoOrigen(cabeceras({ 'sec-fetch-site': 'cross-site' }), ORIGEN)).toBe(false);
		expect(esMismoOrigen(cabeceras({}), ORIGEN)).toBe(false);
	});

	it.each([
		'https://evil.com',
		'http://www.donde-sino.com',
		'https://www.donde-sino.com.evil.com',
		'https://www.donde-sino.com:8443',
		'null',
		'',
	])('rechaza el Origin %j', (origin) => {
		expect(esMismoOrigen(cabeceras({ origin }), ORIGEN)).toBe(false);
	});

	it('un Origin ajeno no se salva por un Sec-Fetch-Site falsificado', () => {
		expect(esMismoOrigen(cabeceras({ origin: 'https://evil.com', 'sec-fetch-site': 'same-origin' }), ORIGEN)).toBe(false);
	});
});
