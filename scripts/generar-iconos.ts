/**
 * Genera el logo optimizado y los íconos del sitio a partir del logo original
 * (`npm run marca:iconos`). Se ejecuta solo cuando cambia el logo; los archivos
 * generados se versionan en `public/marca/` y `public/favicon.ico`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp, { type Sharp } from 'sharp';

const ORIGEN = 'src/assets/marca/logo-donde-si-no.png';
const DESTINO = 'public/marca';
const FONDO_CREMA = '#fffbf0';

const mascaraCircular = (lado: number): Buffer =>
	Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}"/></svg>`);

/** El logo original trae esquinas blancas opacas: se recorta en círculo para que funcione sobre cualquier fondo. */
async function logo(lado: number): Promise<Sharp> {
	const recortado = await sharp(ORIGEN)
		.resize(lado, lado, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.composite([{ input: mascaraCircular(lado), blend: 'dest-in' }])
		.png()
		.toBuffer();
	return sharp(recortado);
}

/** ICO con una sola imagen PNG embebida (formato válido desde Windows Vista y en todos los navegadores). */
function pngAIco(png: Buffer, lado: number): Buffer {
	const cabecera = Buffer.alloc(6);
	cabecera.writeUInt16LE(0, 0); // reservado
	cabecera.writeUInt16LE(1, 2); // tipo: ícono
	cabecera.writeUInt16LE(1, 4); // cantidad de imágenes

	const entrada = Buffer.alloc(16);
	entrada.writeUInt8(lado, 0);
	entrada.writeUInt8(lado, 1);
	entrada.writeUInt16LE(1, 4); // planos de color
	entrada.writeUInt16LE(32, 6); // bits por píxel
	entrada.writeUInt32LE(png.length, 8);
	entrada.writeUInt32LE(cabecera.length + entrada.length, 12);

	return Buffer.concat([cabecera, entrada, png]);
}

await mkdir(DESTINO, { recursive: true });

// Logo del encabezado: se muestra a 160 px CSS (1x y 2x).
await (await logo(160)).webp({ quality: 82 }).toFile(`${DESTINO}/logo-160.webp`);
await (await logo(320)).webp({ quality: 82 }).toFile(`${DESTINO}/logo-320.webp`);
// Logo para datos estructurados (Google) y redes sociales. El logo es fotográfico: JPEG pesa ~10x menos que PNG.
await (await logo(512)).flatten({ background: FONDO_CREMA }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${DESTINO}/logo-512.jpg`);
// iOS muestra fondo negro en íconos transparentes: se aplana sobre el crema de la marca.
await (await logo(180)).flatten({ background: FONDO_CREMA }).png({ palette: true, quality: 85 }).toFile(`${DESTINO}/apple-touch-icon.png`);
await writeFile('public/favicon.ico', pngAIco(await (await logo(32)).png().toBuffer(), 32));

console.info('Íconos generados en public/marca/ y public/favicon.ico');
