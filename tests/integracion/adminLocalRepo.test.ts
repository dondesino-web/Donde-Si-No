import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { negocio } from '../../src/lib/db/esquema.ts';
import { sembrar } from '../../src/lib/db/semilla.ts';
import { guardarNegocio, obtenerNegocioAdmin, type DatosNegocio } from '../../src/lib/repositorios/adminLocalRepo.ts';
import { obtenerCartaPublica } from '../../src/lib/repositorios/cartaRepo.ts';
import { construirJsonLd } from '../../src/lib/seo/jsonld.ts';
import { crearBdPrueba, type BdPrueba } from '../ayudantes/bd.ts';

const datos = (cambios: Partial<DatosNegocio> = {}): DatosNegocio => ({
	esloganEs: '¡Aquí hay sabor!',
	esloganEn: null,
	descripcionEs: 'Comida rápida.',
	descripcionEn: null,
	telefono: '+56988860939',
	whatsapp: null,
	direccion: 'Ruta G60 Km 3',
	comuna: 'Melipilla',
	region: 'Región Metropolitana',
	codigoPostal: null,
	latitud: null,
	longitud: null,
	mapsUrl: null,
	resenaUrl: null,
	instagramUrl: null,
	facebookUrl: null,
	ubereatsUrl: null,
	rangoPrecio: null,
	servicios: { wifi: true, petFriendly: false, banos: true, paraLlevar: true, consumoLocal: true },
	horario: {},
	...cambios,
});

describe('repositorio de datos del local', () => {
	let prueba: BdPrueba;

	beforeEach(async () => {
		prueba = await crearBdPrueba();
		await sembrar(prueba.bd);
	});

	afterEach(() => prueba.cerrar());

	it('lee la fila única del local', async () => {
		const negocio = await obtenerNegocioAdmin(prueba.bd);

		expect(negocio).toMatchObject({ id: 1, nombre: 'Dónde Si No' });
	});

	it('guarda los datos sin tocar el nombre y renueva la fecha de modificación', async () => {
		const antes = await obtenerNegocioAdmin(prueba.bd);

		const ok = await guardarNegocio(
			prueba.bd,
			datos({
				instagramUrl: 'https://www.instagram.com/dondesino',
				horario: { lun: [{ abre: '12:00', cierra: '01:00' }] },
				servicios: { wifi: false, petFriendly: true, banos: true, paraLlevar: true, consumoLocal: true },
				latitud: -33.7,
				longitud: -71.2,
			}),
		);

		expect(ok).toBe(true);
		const despues = await obtenerNegocioAdmin(prueba.bd);
		expect(despues).toMatchObject({
			nombre: 'Dónde Si No',
			instagramUrl: 'https://www.instagram.com/dondesino',
			horario: { lun: [{ abre: '12:00', cierra: '01:00' }] },
			servicios: { wifi: false, petFriendly: true },
			latitud: -33.7,
		});
		expect(despues!.actualizadoEn.getTime()).toBeGreaterThanOrEqual(antes!.actualizadoEn.getTime());
	});

	it('devuelve false si el local aún no fue sembrado', async () => {
		const vacia = await crearBdPrueba();
		try {
			expect(await guardarNegocio(vacia.bd, datos())).toBe(false);
		} finally {
			vacia.cerrar();
		}
	});

	it('lo guardado llega a la carta pública y a los datos estructurados', async () => {
		await guardarNegocio(
			prueba.bd,
			datos({ instagramUrl: 'https://www.instagram.com/dondesino', horario: { vie: [{ abre: '09:00', cierra: '20:00' }] }, latitud: -33.7, longitud: -71.2 }),
		);

		const carta = await obtenerCartaPublica(prueba.bd);
		const ld = construirJsonLd(carta, 'es', 'https://www.donde-sino.com');

		expect(carta.negocio.horario.vie).toEqual([{ abre: '09:00', cierra: '20:00' }]);
		expect(ld.sameAs).toEqual(['https://www.instagram.com/dondesino']);
		expect(ld.geo).toMatchObject({ latitude: -33.7, longitude: -71.2 });
		expect(ld.openingHoursSpecification).toHaveLength(1);
	});
});

describe('defensa al renderizar la carta pública', () => {
	it('descarta enlaces que no sean https aunque estén en la base', async () => {
		const prueba = await crearBdPrueba();
		try {
			await sembrar(prueba.bd);
			await prueba.bd.update(negocio).set({
				instagramUrl: 'javascript:alert(1)',
				facebookUrl: 'http://facebook.com/x',
				ubereatsUrl: 'https://www.ubereats.com/cl',
				mapsUrl: 'data:text/html,x',
				resenaUrl: 'https://g.page/r/abc/review',
			});

			const carta = await obtenerCartaPublica(prueba.bd);

			expect(carta.negocio).toMatchObject({
				instagramUrl: null,
				facebookUrl: null,
				ubereatsUrl: 'https://www.ubereats.com/cl',
				mapsUrl: null,
				resenaUrl: 'https://g.page/r/abc/review',
			});
		} finally {
			prueba.cerrar();
		}
	});
});
