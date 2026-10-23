import type { Idioma } from '../../i18n/ui.ts';

const FORMATO_PRECIO: Record<Idioma, Intl.NumberFormat> = {
	es: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }),
	// En inglés «$» se leería como dólares: se muestra el código de la moneda.
	en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CLP', currencyDisplay: 'code' }),
};

const CELULAR_CHILE = /^\+569(\d{4})(\d{4})$/;

/** `null` cuando el producto no tiene precio: la interfaz muestra «Consultar». */
export function formatearPrecio(precio: number | null, idioma: Idioma): string | null {
	return precio === null ? null : FORMATO_PRECIO[idioma].format(precio).replace(/ /g, ' ');
}

export function formatearTelefono(e164: string): string {
	const partes = CELULAR_CHILE.exec(e164);
	return partes ? `+56 9 ${partes[1]} ${partes[2]}` : e164;
}
