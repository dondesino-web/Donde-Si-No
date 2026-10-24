/** Convierte el QR (SVG) en un PNG de 1200 px en el navegador y lo descarga. Sin dependencias ni procesamiento en el servidor. */
const LADO_PNG = 1200;

const boton = document.getElementById('descargar-png');
const estado = document.getElementById('estado-png');

const avisar = (texto: string): void => {
	if (estado) estado.textContent = texto;
};

async function descargarPng(): Promise<void> {
	avisar('Preparando el PNG…');
	const respuesta = await fetch('/admin/qr/codigo.svg');
	if (!respuesta.ok) throw new Error('No se pudo obtener el código QR.');

	const urlSvg = URL.createObjectURL(await respuesta.blob());
	try {
		const imagen = new Image();
		await new Promise<void>((resolver, rechazar) => {
			imagen.onload = () => resolver();
			imagen.onerror = () => rechazar(new Error('No se pudo leer el código QR.'));
			imagen.src = urlSvg;
		});

		const lienzo = document.createElement('canvas');
		lienzo.width = LADO_PNG;
		lienzo.height = LADO_PNG;
		const contexto = lienzo.getContext('2d');
		if (!contexto) throw new Error('Este navegador no puede preparar el PNG.');
		// Sin suavizado: los módulos del QR deben quedar con bordes nítidos.
		contexto.imageSmoothingEnabled = false;
		contexto.drawImage(imagen, 0, 0, LADO_PNG, LADO_PNG);

		const png = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/png'));
		if (!png) throw new Error('No se pudo crear el PNG.');

		const enlace = document.createElement('a');
		enlace.href = URL.createObjectURL(png);
		enlace.download = 'qr-donde-si-no.png';
		enlace.click();
		URL.revokeObjectURL(enlace.href);
		avisar('PNG descargado.');
	} finally {
		URL.revokeObjectURL(urlSvg);
	}
}

boton?.addEventListener('click', () => {
	descargarPng().catch((error: unknown) => avisar(error instanceof Error ? error.message : 'No se pudo descargar el PNG.'));
});
