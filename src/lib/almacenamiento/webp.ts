export interface DimensionesImagen {
	ancho: number;
	alto: number;
}

const LARGO_MINIMO = 25;
const LARGO_MINIMO_CON_DIMENSIONES = 30;
const LADO_MAXIMO_DECLARABLE = 16383;

/**
 * Chunks aceptados. Las animaciones (`ANIM`, `ANMF`) no: son fotos. Cualquier otro identificador se rechaza,
 * para que nadie esconda contenido arbitrario en un chunk que ningún lector de imágenes revisa.
 */
const CHUNKS_PERMITIDOS = new Set(['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ICCP', 'EXIF', 'XMP ']);
const CHUNKS_DE_IMAGEN = new Set(['VP8 ', 'VP8L']);
const PRIMEROS_CHUNKS = new Set(['VP8X', 'VP8 ', 'VP8L']);

/**
 * Recorre el contenedor chunk por chunk. Es válido solo si cada tamaño cuadra, no sobra ni falta ningún byte,
 * todos los identificadores son conocidos y hay al menos un chunk con la imagen.
 */
function estructuraValida(bytes: Uint8Array, vista: DataView, texto: (inicio: number, largo: number) => string): boolean {
	if (!PRIMEROS_CHUNKS.has(texto(12, 4))) return false;

	let posicion = 12;
	let hayImagen = false;
	while (posicion < bytes.length) {
		if (posicion + 8 > bytes.length) return false;
		const id = texto(posicion, 4);
		const tamano = vista.getUint32(posicion + 4, true);
		const fin = posicion + 8 + tamano;
		if (!CHUNKS_PERMITIDOS.has(id) || fin > bytes.length) return false;
		if (CHUNKS_DE_IMAGEN.has(id)) hayImagen = true;
		// Los chunks de tamaño impar llevan un byte de relleno.
		posicion = fin + (tamano & 1);
	}
	return posicion === bytes.length && hayImagen;
}

/**
 * Lee las dimensiones de un WebP mirando su propia cabecera, o devuelve `undefined` si no es un WebP íntegro.
 * No se confía en lo que diga el cliente: el servidor valida los bytes (firma RIFF/WEBP, tamaño declarado igual al real,
 * estructura de chunks conocida y sin datos de más) y los píxeles que de verdad tiene la imagen.
 * Cubre los tres formatos: con pérdida (VP8), sin pérdida (VP8L) y extendido (VP8X, p. ej. con transparencia).
 */
export function leerWebp(bytes: Uint8Array): DimensionesImagen | undefined {
	if (bytes.length < LARGO_MINIMO) return undefined;

	const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const texto = (inicio: number, largo: number): string => String.fromCharCode(...bytes.subarray(inicio, inicio + largo));
	if (texto(0, 4) !== 'RIFF' || texto(8, 4) !== 'WEBP') return undefined;
	// El tamaño declarado debe ser exacto: un archivo con algo más pegado al final no es solo una imagen.
	if (vista.getUint32(4, true) + 8 !== bytes.length) return undefined;
	if (!estructuraValida(bytes, vista, texto)) return undefined;

	const formato = texto(12, 4);
	let dimensiones: DimensionesImagen | undefined;

	if (formato === 'VP8 ' && bytes.length >= LARGO_MINIMO_CON_DIMENSIONES) {
		const esCuadroClave = (bytes[20] & 1) === 0;
		const tieneCodigoDeInicio = bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a;
		if (esCuadroClave && tieneCodigoDeInicio) {
			dimensiones = { ancho: vista.getUint16(26, true) & 0x3fff, alto: vista.getUint16(28, true) & 0x3fff };
		}
	} else if (formato === 'VP8L') {
		if (bytes[20] === 0x2f) {
			const bits = vista.getUint32(21, true);
			dimensiones = { ancho: (bits & 0x3fff) + 1, alto: ((bits >>> 14) & 0x3fff) + 1 };
		}
	} else if (formato === 'VP8X' && bytes.length >= LARGO_MINIMO_CON_DIMENSIONES) {
		dimensiones = {
			ancho: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
			alto: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
		};
	}

	const valida = dimensiones && dimensiones.ancho > 0 && dimensiones.alto > 0;
	return valida && dimensiones!.ancho <= LADO_MAXIMO_DECLARABLE && dimensiones!.alto <= LADO_MAXIMO_DECLARABLE ? dimensiones : undefined;
}
