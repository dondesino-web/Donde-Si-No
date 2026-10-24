import type { APIRoute } from 'astro';
import { svgDelQr, urlDelQr } from '../../../lib/qr.ts';

// El middleware exige sesión en /admin/*.
export const prerender = false;

/** El QR del local en SVG. Con `?descargar=1` el navegador lo guarda como archivo en vez de mostrarlo. */
export const GET: APIRoute = ({ site, url }) => {
	const svg = svgDelQr(urlDelQr(site!));
	const headers: Record<string, string> = { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' };
	if (url.searchParams.get('descargar') === '1') headers['Content-Disposition'] = 'attachment; filename="qr-donde-si-no.svg"';
	return new Response(svg, { headers });
};
