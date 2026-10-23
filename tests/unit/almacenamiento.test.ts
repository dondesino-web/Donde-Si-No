import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, inject, it, vi } from 'vitest';

const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
vi.mock('@vercel/blob', () => blob);

const { crearAlmacenBlob, crearAlmacenLocal, elegirAlmacen } = await import(
	'../../src/lib/almacenamiento/almacen.ts'
);

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

function directorioNuevo(): string {
	const directorio = join(inject('directorioTemporal'), randomUUID());
	mkdirSync(directorio);
	return directorio;
}

describe('almacén local (desarrollo)', () => {
	it('guarda la imagen en disco con un nombre aleatorio y devuelve su URL pública', async () => {
		const directorio = directorioNuevo();
		const almacen = crearAlmacenLocal({ directorio, urlBase: '/uploads' });

		const { clave, url } = await almacen.subir(WEBP);

		expect(clave).toMatch(/^[0-9a-f-]{36}\.webp$/);
		expect(url).toBe(`/uploads/${clave}`);
		expect(readFileSync(join(directorio, clave))).toEqual(Buffer.from(WEBP));
	});

	it('genera claves distintas para cada subida', async () => {
		const almacen = crearAlmacenLocal({ directorio: directorioNuevo(), urlBase: '/uploads' });

		const a = await almacen.subir(WEBP);
		const b = await almacen.subir(WEBP);

		expect(a.clave).not.toBe(b.clave);
	});

	it('crea el directorio si todavía no existe', async () => {
		const directorio = join(directorioNuevo(), 'uploads');
		const almacen = crearAlmacenLocal({ directorio, urlBase: '/uploads' });

		const { clave } = await almacen.subir(WEBP);

		expect(existsSync(join(directorio, clave))).toBe(true);
	});

	it('elimina una imagen subida a partir de su URL', async () => {
		const directorio = directorioNuevo();
		const almacen = crearAlmacenLocal({ directorio, urlBase: '/uploads' });
		const { clave, url } = await almacen.subir(WEBP);

		await almacen.eliminar(url);

		expect(existsSync(join(directorio, clave))).toBe(false);
	});

	it.each([
		'/uploads/../../package.json',
		'/uploads/..%2F..%2Fpackage.json',
		'/otra-carpeta/3f2a1b4c-0000-4000-8000-000000000000.webp',
		'/uploads/no-es-una-clave.webp',
		'/uploads/3f2a1b4c-0000-4000-8000-000000000000.png',
	])('rechaza borrar una ruta que no es una imagen subida: %s', async (url) => {
		const almacen = crearAlmacenLocal({ directorio: directorioNuevo(), urlBase: '/uploads' });

		await expect(almacen.eliminar(url)).rejects.toThrow('URL de imagen no válida');
	});
});

describe('almacén Vercel Blob (producción)', () => {
	const URL_BLOB = 'https://abc.public.blob.vercel-storage.com/carta/3f2a1b4c-0000-4000-8000-000000000000.webp';

	beforeEach(() => {
		blob.put.mockReset();
		blob.del.mockReset();
	});

	it('sube la imagen como pública, con caché larga y sin sobrescribir', async () => {
		blob.put.mockResolvedValue({
			url: URL_BLOB,
			pathname: 'carta/3f2a1b4c-0000-4000-8000-000000000000.webp',
		});
		const almacen = crearAlmacenBlob({ token: 'token-de-prueba' });

		const resultado = await almacen.subir(WEBP);

		const [ruta, cuerpo, opciones] = blob.put.mock.calls[0];
		expect(ruta).toMatch(/^carta\/[0-9a-f-]{36}\.webp$/);
		expect(Buffer.from(cuerpo)).toEqual(Buffer.from(WEBP));
		expect(opciones).toMatchObject({
			access: 'public',
			contentType: 'image/webp',
			token: 'token-de-prueba',
			addRandomSuffix: false,
			allowOverwrite: false,
			cacheControlMaxAge: 31_536_000,
		});
		expect(resultado).toEqual({
			clave: 'carta/3f2a1b4c-0000-4000-8000-000000000000.webp',
			url: URL_BLOB,
		});
	});

	it('elimina una foto de la carta a partir de su URL', async () => {
		const almacen = crearAlmacenBlob({ token: 'token-de-prueba' });

		await almacen.eliminar(URL_BLOB);

		expect(blob.del).toHaveBeenCalledWith(URL_BLOB, { token: 'token-de-prueba' });
	});

	it.each([
		'https://evil.example.com/carta/3f2a1b4c-0000-4000-8000-000000000000.webp',
		'http://abc.public.blob.vercel-storage.com/carta/3f2a1b4c-0000-4000-8000-000000000000.webp',
		'https://abc.public.blob.vercel-storage.com/respaldos/3f2a1b4c-0000-4000-8000-000000000000.webp',
		'https://abc.public.blob.vercel-storage.com/carta/otra-cosa.json',
		'no-es-url',
	])(
		'rechaza borrar algo que no es una foto de la carta: %s',
		async (url) => {
			const almacen = crearAlmacenBlob({ token: 'token-de-prueba' });

			await expect(almacen.eliminar(url)).rejects.toThrow('URL de imagen no válida');
			expect(blob.del).not.toHaveBeenCalled();
		},
	);
});

describe('elegirAlmacen', () => {
	const local = { directorio: 'public/uploads', urlBase: '/uploads' };

	it('usa Vercel Blob cuando hay token', () => {
		const almacen = elegirAlmacen({ blobToken: 'token', esProduccion: true, local });

		expect(almacen.tipo).toBe('blob');
	});

	it('usa el disco local en desarrollo sin token', () => {
		const almacen = elegirAlmacen({ blobToken: undefined, esProduccion: false, local });

		expect(almacen.tipo).toBe('local');
	});

	it('falla en producción si falta el token, en vez de escribir en disco', () => {
		expect(() => elegirAlmacen({ blobToken: undefined, esProduccion: true, local })).toThrow(
			'BLOB_READ_WRITE_TOKEN',
		);
	});
});
