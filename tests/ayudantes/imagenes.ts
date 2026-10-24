import sharp from 'sharp';

/** WebP real generado con sharp, para probar el lector y la validación con archivos auténticos. */
export async function crearWebp(ancho: number, alto: number, opciones: { sinPerdida?: boolean; conAlfa?: boolean } = {}): Promise<Uint8Array> {
	const buffer = await sharp({
		create: {
			width: ancho,
			height: alto,
			channels: opciones.conAlfa ? 4 : 3,
			background: opciones.conAlfa ? { r: 200, g: 30, b: 30, alpha: 0.5 } : { r: 200, g: 30, b: 30 },
		},
	})
		.webp({ lossless: opciones.sinPerdida ?? false })
		.toBuffer();
	return new Uint8Array(buffer);
}

export async function crearPng(ancho: number, alto: number): Promise<Uint8Array> {
	const buffer = await sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 0, g: 0, b: 0 } } })
		.png()
		.toBuffer();
	return new Uint8Array(buffer);
}
