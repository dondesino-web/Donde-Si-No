import { LIMITES_FOTO } from '../lib/almacenamiento/validarFoto.ts';

/** Lados máximos de cada versión y calidades de WebP a probar (de mejor a más liviana). */
const LADO_CHICA = 480;
const LADO_GRANDE = 1200;
const CALIDADES = [0.82, 0.72, 0.6, 0.5];
const REDUCCION_SI_PESA_MUCHO = 0.85;
const MARGEN_DE_PESO = 0.93;

export interface FotosPreparadas {
	chica: Blob;
	grande: Blob;
}

export class NavegadorNoSoportado extends Error {}

function aBlobWebp(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob> {
	return new Promise((resolver, rechazar) => {
		lienzo.toBlob(
			(blob) => {
				// Algunos navegadores no saben escribir WebP y devuelven PNG sin avisar.
				if (blob?.type === 'image/webp') resolver(blob);
				else rechazar(new NavegadorNoSoportado('Este navegador no puede preparar la foto. Prueba con Chrome o Firefox.'));
			},
			'image/webp',
			calidad,
		);
	});
}

async function reducir(imagen: ImageBitmap, ladoMaximo: number, pesoMaximo: number): Promise<Blob> {
	let lado = Math.min(ladoMaximo, Math.max(imagen.width, imagen.height));
	// Si aun con la peor calidad pesa de más, se achica la foto y se vuelve a intentar.
	for (let intento = 0; intento < 6; intento++) {
		const escala = lado / Math.max(imagen.width, imagen.height);
		const lienzo = document.createElement('canvas');
		lienzo.width = Math.max(1, Math.round(imagen.width * escala));
		lienzo.height = Math.max(1, Math.round(imagen.height * escala));
		lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

		for (const calidad of CALIDADES) {
			const blob = await aBlobWebp(lienzo, calidad);
			if (blob.size <= pesoMaximo * MARGEN_DE_PESO) return blob;
		}
		lado = Math.round(lado * REDUCCION_SI_PESA_MUCHO);
	}
	throw new Error('La foto no se pudo reducir lo suficiente.');
}

/** Convierte la foto elegida (JPG, PNG, WebP…) en las dos versiones WebP que espera el servidor. */
export async function prepararFoto(archivo: File): Promise<FotosPreparadas> {
	let imagen: ImageBitmap;
	try {
		// `from-image` respeta la orientación de las fotos tomadas con el celular.
		imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('No se pudo leer esa imagen. Elige una foto en formato JPG, PNG o WebP.');
	}

	try {
		const [chica, grande] = await Promise.all([
			reducir(imagen, LADO_CHICA, LIMITES_FOTO.bytesChica),
			reducir(imagen, LADO_GRANDE, LIMITES_FOTO.bytesGrande),
		]);
		return { chica, grande };
	} finally {
		imagen.close();
	}
}
