import { createHmac, timingSafeEqual } from 'node:crypto';

const LARGO_MINIMO_SECRETO = 32;

export interface DatosSubida {
	sm: string;
	lg: string;
	ancho: number;
	alto: number;
}

export type SubidaFirmada = DatosSubida & { firma: string };

/*
 * El endpoint de subida firma lo que devuelve (URLs y dimensiones) y el formulario solo acepta subidas con firma válida.
 * Así una persona (o una pestaña vieja) no puede inventar una URL, apuntarla a la foto de otro producto ni cambiar las
 * dimensiones: solo se puede guardar lo que este servidor acaba de emitir.
 */
const firmar = (secreto: string, { sm, lg, ancho, alto }: DatosSubida): string =>
	createHmac('sha256', secreto).update(`foto:${sm}|${lg}|${ancho}|${alto}`).digest('base64url');

export function firmarSubida(secreto: string, datos: DatosSubida): string {
	if (secreto.length < LARGO_MINIMO_SECRETO) throw new Error(`El secreto debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres.`);
	return firmar(secreto, datos);
}

export function verificarSubida(secreto: string, subida: SubidaFirmada): boolean {
	if (secreto.length < LARGO_MINIMO_SECRETO) return false;

	const esperada = Buffer.from(firmar(secreto, subida));
	const recibida = Buffer.from(subida.firma);
	return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
