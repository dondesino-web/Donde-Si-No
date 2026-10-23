import { encode, renderSVG } from 'uqr';

/** Nivel de corrección de errores: aguanta hasta ~25 % de daño, útil en una tarjeta de mesa manchada o rayada. */
const CORRECCION = 'Q';
/** Zona de silencio que exige el estándar QR (4 módulos); sin ella muchos lectores no reconocen el código. */
const ZONA_DE_SILENCIO = 4;

/**
 * La dirección que lleva el QR: siempre `/qr` del sitio, nunca la carta directa. Así el QR impreso es permanente
 * (si algún día cambia el destino, solo se cambia la redirección) y cada escaneo se cuenta.
 * Exige https: un QR impreso con una dirección equivocada no se puede corregir.
 */
export function urlDelQr(sitio: URL): string {
	if (sitio.protocol !== 'https:') throw new Error('El QR debe apuntar a una dirección https (revisa `site` en astro.config.mjs).');
	return `${sitio.origin}/qr`;
}

/** SVG listo para descargar o imprimir: fondo blanco, módulos negros y zona de silencio. */
export function svgDelQr(url: string): string {
	return renderSVG(url, { ecc: CORRECCION, border: ZONA_DE_SILENCIO });
}

/** Módulos del QR (sin zona de silencio): `true` = oscuro. Sirve para dibujarlo en un lienzo y descargarlo como PNG. */
export function matrizDelQr(url: string): boolean[][] {
	return encode(url, { ecc: CORRECCION, border: 0 }).data;
}
