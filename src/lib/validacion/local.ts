import { z } from 'astro/zod';
import type { Horario, Servicios } from '../dominio/tipos.ts';
import { aNuloSiVacio, aResultado, cadena, lista, texto, textoOpcional, type ResultadoValidacion } from './comun.ts';
import { parsearHorario } from './horarioFormulario.ts';

export interface DatosLocalFormulario {
	esloganEs: string;
	esloganEn: string | null;
	descripcionEs: string;
	descripcionEn: string | null;
	telefono: string | null;
	whatsapp: string | null;
	direccion: string;
	comuna: string;
	region: string;
	codigoPostal: string | null;
	latitud: number | null;
	longitud: number | null;
	mapsUrl: string | null;
	resenaUrl: string | null;
	instagramUrl: string | null;
	facebookUrl: string | null;
	ubereatsUrl: string | null;
	rangoPrecio: string | null;
	servicios: Servicios;
	horario: Horario;
}

export const SERVICIOS: readonly (keyof Servicios)[] = ['wifi', 'petFriendly', 'banos', 'paraLlevar', 'consumoLocal'];

const LARGO_MAXIMO_ENLACE = 300;
/**
 * Hosts exactos (nunca «cualquier subdominio»): `sites.google.com` o `docs.google.com` son páginas que cualquiera puede publicar,
 * y los acortadores o `google.com/url?q=` redirigen a cualquier destino. Un host puede exigir además un prefijo de ruta.
 */
export type ReglaEnlace = readonly { host: string; ruta?: RegExp }[];

const RUTA_GOOGLE_MAPS = /^\/(maps|local)(\/|$)/;
export const REGLA_GOOGLE: ReglaEnlace = [
	{ host: 'www.google.com', ruta: RUTA_GOOGLE_MAPS },
	{ host: 'google.com', ruta: RUTA_GOOGLE_MAPS },
	{ host: 'www.google.cl', ruta: RUTA_GOOGLE_MAPS },
	{ host: 'google.cl', ruta: RUTA_GOOGLE_MAPS },
	{ host: 'search.google.com', ruta: /^\/local(\/|$)/ },
	{ host: 'maps.google.com' },
	{ host: 'maps.app.goo.gl' },
	{ host: 'g.page' },
];
export const REGLA_INSTAGRAM: ReglaEnlace = [{ host: 'instagram.com' }, { host: 'www.instagram.com' }, { host: 'm.instagram.com' }];
export const REGLA_FACEBOOK: ReglaEnlace = [
	{ host: 'facebook.com' },
	{ host: 'www.facebook.com' },
	{ host: 'm.facebook.com' },
	{ host: 'fb.com' },
	{ host: 'www.fb.com' },
];
export const REGLA_UBEREATS: ReglaEnlace = [{ host: 'ubereats.com' }, { host: 'www.ubereats.com' }];

/**
 * Normaliza un teléfono a formato internacional (`+56988860939`). Acepta celulares y fijos de Chile con o sin `+56`,
 * espacios o guiones, y números internacionales con `+`. Vacío = sin teléfono (`null`); inválido = `undefined`.
 */
export function normalizarTelefono(entrada: string): string | null | undefined {
	const escrito = entrada.trim();
	if (escrito === '') return null;
	if (!/^\+?[\d\s().-]+$/.test(escrito)) return undefined;

	const digitos = escrito.replace(/\D/g, '');
	if (escrito.startsWith('+')) {
		if (digitos.startsWith('56')) return digitos.length === 11 ? `+${digitos}` : undefined;
		return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : undefined;
	}
	if (/^56\d{9}$/.test(digitos)) return `+${digitos}`;
	if (/^\d{9}$/.test(digitos)) return `+56${digitos}`;
	return undefined;
}

/**
 * Un enlace que se publica en la carta: solo `https://`, sin usuario, clave ni puerto, y de un host exacto de la regla.
 * Así un enlace `javascript:` o de otro sitio nunca llega a un `href`. Vacío = sin enlace (`null`); inválido = `undefined`.
 */
export function validarEnlace(entrada: string, regla: ReglaEnlace): string | null | undefined {
	const escrito = entrada.trim();
	if (escrito === '') return null;
	if (escrito.length > LARGO_MAXIMO_ENLACE) return undefined;

	let url: URL;
	try {
		url = new URL(escrito);
	} catch {
		return undefined;
	}
	if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;

	const host = url.hostname.toLowerCase();
	const permitido = regla.some((r) => r.host === host && (r.ruta === undefined || r.ruta.test(url.pathname)));
	return permitido ? url.href : undefined;
}

/** Convierte una función «valor o `undefined` si es inválido» en un esquema que informa `mensaje`. */
const conversion = <T>(convertir: (valor: string) => T | undefined, mensaje: string) =>
	z.string().transform((valor, contexto) => {
		const resultado = convertir(valor);
		if (resultado === undefined) {
			contexto.addIssue({ code: 'custom', message: mensaje });
			return z.NEVER;
		}
		return resultado;
	});

const enlace = (regla: ReglaEnlace, nombreSitio: string) =>
	conversion((valor) => validarEnlace(valor, regla), `Pega un enlace que empiece con https:// y sea de ${nombreSitio}.`);

function coordenada(minimo: number, maximo: number, nombre: string) {
	return conversion((valor) => {
		const limpio = valor.trim().replace(',', '.');
		if (limpio === '') return null;
		if (!/^-?\d+(\.\d+)?$/.test(limpio)) return undefined;
		const numero = Number(limpio);
		return numero >= minimo && numero <= maximo ? numero : undefined;
	}, `${nombre} debe ser un número entre ${minimo} y ${maximo} (por ejemplo -33.7).`);
}

const localSchema = z
	.object({
		esloganEs: textoOpcional(80, 'El eslogan'),
		esloganEn: textoOpcional(80, 'El eslogan en inglés').transform(aNuloSiVacio),
		descripcionEs: textoOpcional(600, 'La descripción'),
		descripcionEn: textoOpcional(600, 'La descripción en inglés').transform(aNuloSiVacio),
		telefono: conversion(normalizarTelefono, 'El teléfono no es válido (por ejemplo +56 9 8886 0939).'),
		whatsapp: conversion(normalizarTelefono, 'El WhatsApp no es válido (por ejemplo +56 9 8886 0939).'),
		direccion: texto('Escribe la dirección.', 120, 'La dirección'),
		comuna: texto('Escribe la comuna.', 60, 'La comuna'),
		region: texto('Escribe la región.', 60, 'La región'),
		codigoPostal: z
			.string()
			.trim()
			.regex(/^(\d{7})?$/, 'El código postal tiene 7 números.')
			.transform(aNuloSiVacio),
		latitud: coordenada(-90, 90, 'La latitud'),
		longitud: coordenada(-180, 180, 'La longitud'),
		mapsUrl: enlace(REGLA_GOOGLE, 'Google'),
		resenaUrl: enlace(REGLA_GOOGLE, 'Google'),
		instagramUrl: enlace(REGLA_INSTAGRAM, 'Instagram'),
		facebookUrl: enlace(REGLA_FACEBOOK, 'Facebook'),
		ubereatsUrl: enlace(REGLA_UBEREATS, 'Uber Eats'),
		rangoPrecio: textoOpcional(40, 'El rango de precios').transform(aNuloSiVacio),
		servicios: z.array(z.enum(SERVICIOS as [keyof Servicios, ...(keyof Servicios)[]], { error: 'Servicio no válido.' })).max(SERVICIOS.length),
	})

const CAMPOS_TEXTO = [
	'esloganEs', 'esloganEn', 'descripcionEs', 'descripcionEn', 'telefono', 'whatsapp', 'direccion', 'comuna', 'region', 'codigoPostal',
	'latitud', 'longitud', 'mapsUrl', 'resenaUrl', 'instagramUrl', 'facebookUrl', 'ubereatsUrl', 'rangoPrecio',
] as const;

/** Las coordenadas van de a pares. Se revisa sobre el texto escrito para que el error salga junto con los demás. */
function errorDeParCoordenadas(entrada: Record<string, unknown>): Record<string, string> {
	const hayLatitud = String(entrada.latitud ?? '').trim() !== '';
	const hayLongitud = String(entrada.longitud ?? '').trim() !== '';
	if (hayLatitud && !hayLongitud) return { longitud: 'Si indicas la latitud, indica también la longitud.' };
	if (hayLongitud && !hayLatitud) return { latitud: 'Si indicas la longitud, indica también la latitud.' };
	return {};
}

export function validarLocal(formulario: FormData): ResultadoValidacion<DatosLocalFormulario> {
	const entrada: Record<string, unknown> = Object.fromEntries(CAMPOS_TEXTO.map((campo) => [campo, cadena(formulario, campo)]));
	entrada.servicios = lista(formulario, 'servicios');

	const escalares = aResultado(localSchema.safeParse(entrada));
	const horario = parsearHorario(formulario);

	const parCoordenadas = errorDeParCoordenadas(entrada);

	if (escalares.ok && horario.ok && Object.keys(parCoordenadas).length === 0) {
		const { servicios, ...resto } = escalares.datos;
		const activos = new Set<string>(servicios);
		const estado = Object.fromEntries(SERVICIOS.map((s) => [s, activos.has(s)])) as unknown as Servicios;
		return { ok: true, datos: { ...resto, servicios: estado, horario: horario.horario } };
	}

	return {
		ok: false,
		errores: { ...parCoordenadas, ...(escalares.ok ? {} : escalares.errores), ...(horario.ok ? {} : horario.errores) },
	};
}
