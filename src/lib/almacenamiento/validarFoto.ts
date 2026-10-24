import { leerWebp } from './webp.ts';

/** El navegador envía dos versiones de cada foto: una chica (listas, miniaturas) y una grande (detalle). */
export const LIMITES_FOTO = {
	bytesGrande: 1.5 * 1024 * 1024,
	bytesChica: 400 * 1024,
	ladoMaximoGrande: 1600,
	ladoMaximoChica: 640,
} as const;

/** Diferencia relativa tolerada entre las proporciones de las dos versiones (el redondeo al reducir). */
const TOLERANCIA_PROPORCION = 0.03;

export type ResultadoFoto = { ok: true; ancho: number; alto: number } | { ok: false; error: string };

const falla = (error: string): ResultadoFoto => ({ ok: false, error });

/** Valida lo que llega al servidor antes de guardarlo: peso, formato real, píxeles y que ambas versiones sean la misma foto. */
export function validarFotos(chica: Uint8Array, grande: Uint8Array): ResultadoFoto {
	if (chica.length > LIMITES_FOTO.bytesChica || grande.length > LIMITES_FOTO.bytesGrande) {
		return falla('La foto es demasiado pesada (máximo 1,5 MB).');
	}

	const dimensionesChica = leerWebp(chica);
	const dimensionesGrande = leerWebp(grande);
	if (!dimensionesChica || !dimensionesGrande) return falla('La foto no es un WebP válido.');

	const ladoGrande = Math.max(dimensionesGrande.ancho, dimensionesGrande.alto);
	const ladoChica = Math.max(dimensionesChica.ancho, dimensionesChica.alto);
	if (ladoGrande > LIMITES_FOTO.ladoMaximoGrande || ladoChica > LIMITES_FOTO.ladoMaximoChica) {
		return falla('La foto es demasiado grande en píxeles.');
	}

	const proporcionChica = dimensionesChica.ancho / dimensionesChica.alto;
	const proporcionGrande = dimensionesGrande.ancho / dimensionesGrande.alto;
	const mismaProporcion = Math.abs(proporcionChica - proporcionGrande) / proporcionGrande <= TOLERANCIA_PROPORCION;
	const chicaEsMenor = dimensionesChica.ancho <= dimensionesGrande.ancho && dimensionesChica.alto <= dimensionesGrande.alto;
	if (!mismaProporcion || !chicaEsMenor) return falla('Las dos versiones de la foto no coinciden.');

	return { ok: true, ancho: dimensionesGrande.ancho, alto: dimensionesGrande.alto };
}
