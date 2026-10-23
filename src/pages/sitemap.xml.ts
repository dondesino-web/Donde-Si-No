import type { APIRoute } from 'astro';
import { IDIOMAS, LOCALE } from '../i18n/ui.ts';
import { rutaPagina, type Pagina } from '../i18n/utils.ts';

const PAGINAS: Pagina[] = ['carta', 'imprimir'];

export const GET: APIRoute = ({ site }) => {
	const url = (ruta: string) => new URL(ruta, site).href;
	const entradas = PAGINAS.flatMap((pagina) =>
		IDIOMAS.map((idioma) => {
			const alternos = [...IDIOMAS, 'x-default' as const]
				.map((i) => {
					const destino = i === 'x-default' ? 'es' : i;
					const lang = i === 'x-default' ? i : LOCALE[i];
					return `<xhtml:link rel="alternate" hreflang="${lang}" href="${url(rutaPagina(destino, pagina))}"/>`;
				})
				.join('');
			return `<url><loc>${url(rutaPagina(idioma, pagina))}</loc>${alternos}</url>`;
		}),
	);
	const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entradas.join('')}</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
