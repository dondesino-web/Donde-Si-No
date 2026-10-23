import { describe, expect, it } from 'vitest';
import { leerWebp } from '../../src/lib/almacenamiento/webp.ts';
import { crearPng, crearWebp } from '../ayudantes/imagenes.ts';

describe('leerWebp', () => {
	it.each([
		['con pérdida (VP8)', {}],
		['sin pérdida (VP8L)', { sinPerdida: true }],
		['con transparencia (VP8X)', { conAlfa: true }],
	])('lee las dimensiones de un WebP %s', async (_nombre, opciones) => {
		expect(leerWebp(await crearWebp(120, 80, opciones))).toEqual({ ancho: 120, alto: 80 });
	});

	it('lee tamaños no cuadrados ni pares', async () => {
		expect(leerWebp(await crearWebp(1, 1))).toEqual({ ancho: 1, alto: 1 });
		expect(leerWebp(await crearWebp(333, 77, { sinPerdida: true }))).toEqual({ ancho: 333, alto: 77 });
	});

	it('rechaza otros formatos aunque tengan extensión .webp', async () => {
		expect(leerWebp(await crearPng(50, 50))).toBeUndefined();
		expect(leerWebp(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeUndefined();
	});

	it('rechaza archivos vacíos, truncados o con otro contenedor RIFF', async () => {
		const valido = await crearWebp(60, 40);

		expect(leerWebp(new Uint8Array())).toBeUndefined();
		expect(leerWebp(valido.slice(0, 11))).toBeUndefined();
		expect(leerWebp(valido.slice(0, valido.length - 5))).toBeUndefined();

		const wave = valido.slice();
		wave.set(new TextEncoder().encode('WAVE'), 8);
		expect(leerWebp(wave)).toBeUndefined();
	});

	it('rechaza datos pegados al final (un archivo que es otra cosa además de imagen)', async () => {
		const valido = await crearWebp(60, 40);
		const conCola = new Uint8Array(valido.length + 20);
		conCola.set(valido);
		conCola.set(new TextEncoder().encode('<script>alert(1)</script>'.slice(0, 20)), valido.length);

		expect(leerWebp(conCola)).toBeUndefined();
	});

	it('rechaza un tamaño declarado distinto del real', async () => {
		const valido = await crearWebp(60, 40);
		const mentira = valido.slice();
		new DataView(mentira.buffer).setUint32(4, 99_999, true);

		expect(leerWebp(mentira)).toBeUndefined();
	});

	describe('estructura de chunks', () => {
		const encoder = new TextEncoder();

		/** Arma un WebP VP8X cuyo contenido se controla, con el tamaño RIFF correcto. */
		function vp8x(chunks: { id: string; datos: Uint8Array }[]): Uint8Array {
			const cabecera = new Uint8Array(10); // flags(4) + ancho-1 (3) + alto-1 (3)
			cabecera[4] = 9; // ancho 10
			cabecera[7] = 9; // alto 10
			const todos = [{ id: 'VP8X', datos: cabecera }, ...chunks];
			const cuerpo = todos.flatMap(({ id, datos }) => {
				const relleno = datos.length % 2;
				const encabezado = new Uint8Array(8);
				encabezado.set(encoder.encode(id), 0);
				new DataView(encabezado.buffer).setUint32(4, datos.length, true);
				return [...encabezado, ...datos, ...new Array(relleno).fill(0)];
			});
			const salida = new Uint8Array(12 + cuerpo.length);
			salida.set(encoder.encode('RIFF'), 0);
			new DataView(salida.buffer).setUint32(4, 4 + cuerpo.length, true);
			salida.set(encoder.encode('WEBP'), 8);
			salida.set(cuerpo, 12);
			return salida;
		}

		const imagenVP8L = async (): Promise<Uint8Array> => {
			const real = await crearWebp(10, 10, { sinPerdida: true });
			return real.slice(20, 20 + new DataView(real.buffer, real.byteOffset).getUint32(16, true));
		};

		it('acepta un VP8X con su imagen y metadatos conocidos', async () => {
			const archivo = vp8x([
				{ id: 'EXIF', datos: encoder.encode('datos') },
				{ id: 'VP8L', datos: await imagenVP8L() },
			]);

			expect(leerWebp(archivo)).toEqual({ ancho: 10, alto: 10 });
		});

		it('rechaza un VP8X sin ningún chunk de imagen', () => {
			expect(leerWebp(vp8x([{ id: 'EXIF', datos: encoder.encode('solo metadatos') }]))).toBeUndefined();
		});

		it('rechaza chunks desconocidos, aunque haya imagen', async () => {
			const archivo = vp8x([
				{ id: 'EVIL', datos: encoder.encode('<script>alert(1)</script>') },
				{ id: 'VP8L', datos: await imagenVP8L() },
			]);

			expect(leerWebp(archivo)).toBeUndefined();
		});

		it('rechaza un chunk cuyo tamaño se sale del archivo', async () => {
			const archivo = vp8x([{ id: 'VP8L', datos: await imagenVP8L() }]);
			// Agranda el tamaño declarado del último chunk sin cambiar el archivo.
			new DataView(archivo.buffer).setUint32(12 + 18 + 4, 99_999, true);

			expect(leerWebp(archivo)).toBeUndefined();
		});
	});
});
