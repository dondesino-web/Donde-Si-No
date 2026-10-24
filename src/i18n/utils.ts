import { UI, type ClaveUI, type Idioma } from './ui.ts';

export type Pagina = 'carta' | 'imprimir';
export type Traductor = (clave: ClaveUI, variables?: Record<string, string>) => string;

export interface TextoLocal {
	texto: string;
	/** Idioma real del texto: puede ser español dentro de la página en inglés si falta la traducción. */
	idioma: Idioma;
}

const RUTAS: Record<Idioma, Record<Pagina, string>> = {
	es: { carta: '/', imprimir: '/imprimir' },
	en: { carta: '/en/', imprimir: '/en/print' },
};

export function traductor(idioma: Idioma): Traductor {
	return (clave, variables = {}) =>
		UI[idioma][clave].replace(/\{(\w+)\}/g, (marcador, nombre: string) => variables[nombre] ?? marcador);
}

/** Elige el texto del contenido según el idioma, con el español como respaldo. */
export function textoLocal(idioma: Idioma, es: string, en: string | null | undefined): TextoLocal {
	const traducido = en?.trim();
	return idioma === 'en' && traducido ? { texto: traducido, idioma: 'en' } : { texto: es, idioma: 'es' };
}

export const rutaPagina = (idioma: Idioma, pagina: Pagina): string => RUTAS[idioma][pagina];

export const otroIdioma = (idioma: Idioma): Idioma => (idioma === 'es' ? 'en' : 'es');
