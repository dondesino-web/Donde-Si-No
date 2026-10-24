import { randomUUID } from 'node:crypto';
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it, vi } from 'vitest';

const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn(), list: vi.fn() }));
vi.mock('@vercel/blob', () => blob);

const { crearAlmacenBlob, crearAlmacenLocal } = await import('../../src/lib/almacenamiento/almacen.ts');

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const ID_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ID_B = '1a8fad5b-d9cb-469f-a165-70867728950e';
const HOST = 'https://abc123xyz.public.blob.vercel-storage.com';

function directorioNuevo(): string {
	const directorio = join(inject('directorioTemporal'), randomUUID());
	mkdirSync(directorio);
	return directorio;
}

describe('listar (para limpiar fotos que ningún registro usa)', () => {
	it('el almacén local lista solo sus fotos, con la fecha en que se subieron', async () => {
		const directorio = directorioNuevo();
		const almacen = crearAlmacenLocal({ directorio, urlBase: '/uploads' });
		const antigua = await almacen.subir(WEBP);
		const reciente = await almacen.subir(WEBP);
		const hace3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
		utimesSync(join(directorio, antigua.clave), hace3Dias, hace3Dias);
		writeFileSync(join(directorio, 'notas.txt'), 'no es una foto');
		writeFileSync(join(directorio, 'logo.webp'), 'nombre que no generó el almacén');

		const archivos = await almacen.listar?.();

		expect(archivos?.map((a) => a.url).sort()).toEqual([antigua.url, reciente.url].sort());
		const delAntigua = archivos?.find((a) => a.url === antigua.url);
		expect(Math.abs((delAntigua?.subidoEn.getTime() ?? 0) - hace3Dias.getTime())).toBeLessThan(2000);
	});

	it('un almacén local sin carpeta todavía no tiene fotos', async () => {
		const almacen = crearAlmacenLocal({ directorio: join(directorioNuevo(), 'no-existe'), urlBase: '/uploads' });

		expect(await almacen.listar?.()).toEqual([]);
	});

	it('Vercel Blob lista la carpeta de la carta página por página y descarta lo que no es una foto suya', async () => {
		const antes = new Date('2026-10-01T10:00:00Z');
		blob.list
			.mockResolvedValueOnce({
				blobs: [
					{ url: `${HOST}/carta/${ID_A}.webp`, pathname: `carta/${ID_A}.webp`, uploadedAt: antes },
					{ url: `${HOST}/carta/ajeno.txt`, pathname: 'carta/ajeno.txt', uploadedAt: antes },
				],
				hasMore: true,
				cursor: 'siguiente',
			})
			.mockResolvedValueOnce({
				blobs: [{ url: `${HOST}/carta/${ID_B}.webp`, pathname: `carta/${ID_B}.webp`, uploadedAt: antes }],
				hasMore: false,
			});
		const almacen = crearAlmacenBlob({ token: 'vercel_blob_rw_AbC123xyz_secreto' });

		const archivos = await almacen.listar?.();

		expect(archivos?.map((a) => a.url)).toEqual([`${HOST}/carta/${ID_A}.webp`, `${HOST}/carta/${ID_B}.webp`]);
		expect(archivos?.[0].subidoEn).toEqual(antes);
		expect(blob.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'carta/', token: 'vercel_blob_rw_AbC123xyz_secreto' }));
		expect(blob.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'siguiente' }));
	});
});
