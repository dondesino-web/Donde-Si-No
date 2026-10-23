import { describe, expect, it } from 'vitest';
import {
	REGLA_FACEBOOK,
	REGLA_GOOGLE,
	REGLA_INSTAGRAM,
	REGLA_UBEREATS,
	normalizarTelefono,
	validarEnlace,
	validarLocal,
} from '../../src/lib/validacion/local.ts';

function formulario(campos: Record<string, string | string[]>): FormData {
	const datos = new FormData();
	for (const [clave, valor] of Object.entries(campos)) {
		for (const v of Array.isArray(valor) ? valor : [valor]) datos.append(clave, v);
	}
	return datos;
}

const BASE = { direccion: 'Ruta G60 Km 3 (Camino a Rapel), Chocalán', comuna: 'Melipilla', region: 'Región Metropolitana' };

describe('normalizarTelefono', () => {
	it.each([
		['+56 9 8886 0939', '+56988860939'],
		['+56988860939', '+56988860939'],
		['988860939', '+56988860939'],
		['9 8886-0939', '+56988860939'],
		['56988860939', '+56988860939'],
		['223456789', '+56223456789'],
		['+1 (555) 123-4567', '+15551234567'],
	])('convierte %j en %j', (entrada, esperado) => {
		expect(normalizarTelefono(entrada)).toBe(esperado);
	});

	it.each(['', '   '])('vacío (%j) = sin teléfono', (entrada) => {
		expect(normalizarTelefono(entrada)).toBeNull();
	});

	it.each(['abc', '12345', '+56 9 8886 09', '988860939999', '+', '9888-60939-extra'])('rechaza %j', (entrada) => {
		expect(normalizarTelefono(entrada)).toBeUndefined();
	});
});

describe('validarEnlace', () => {
	it('acepta https de los hosts permitidos', () => {
		expect(validarEnlace('https://www.instagram.com/dondesino', REGLA_INSTAGRAM)).toBe('https://www.instagram.com/dondesino');
		expect(validarEnlace('  https://instagram.com/dondesino  ', REGLA_INSTAGRAM)).toBe('https://instagram.com/dondesino');
		expect(validarEnlace('https://m.facebook.com/dondesino', REGLA_FACEBOOK)).toBe('https://m.facebook.com/dondesino');
		expect(validarEnlace('https://www.ubereats.com/cl/store/x', REGLA_UBEREATS)).toBe('https://www.ubereats.com/cl/store/x');
	});

	it('vacío = sin enlace', () => {
		expect(validarEnlace('', REGLA_INSTAGRAM)).toBeNull();
	});

	it.each([
		'http://www.instagram.com/x',
		'javascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'instagram.com/dondesino',
		'//instagram.com/dondesino',
		'https://evil.com/instagram.com',
		'https://instagram.com.evil.com/x',
		'https://user:clave@instagram.com/x',
		'https://notinstagram.com/x',
		'https://instagram.com:8443/x',
		'https://sub.instagram.com/x',
		`https://instagram.com/${'a'.repeat(300)}`,
	])('rechaza %j', (url) => {
		expect(validarEnlace(url, REGLA_INSTAGRAM)).toBeUndefined();
	});

	describe('enlaces de Google', () => {
		it.each([
			'https://www.google.com/maps/place/Donde+Si+No',
			'https://www.google.com/maps/search/?api=1&query=Donde+Si+No',
			'https://www.google.cl/maps/place/x',
			'https://maps.google.com/?cid=123',
			'https://maps.app.goo.gl/AbCdEf',
			'https://g.page/r/AbCdEf/review',
			'https://search.google.com/local/writereview?placeid=abc',
		])('acepta %s', (url) => {
			expect(validarEnlace(url, REGLA_GOOGLE)).toBe(url);
		});

		it.each([
			'https://sites.google.com/view/pagina-de-cualquiera',
			'https://docs.google.com/forms/d/e/x',
			'https://drive.google.com/file/d/x',
			'https://script.google.com/macros/s/x/exec',
			'https://www.google.com/url?q=https://evil.com',
			'https://www.google.com/amp/s/evil.com',
			'https://goo.gl/abc',
			'https://www.google.com:444/maps/place/x',
		])('rechaza %s (páginas que cualquiera puede publicar o redirigir)', (url) => {
			expect(validarEnlace(url, REGLA_GOOGLE)).toBeUndefined();
		});
	});

	describe('Facebook', () => {
		it('no acepta acortadores que apuntan a cualquier destino', () => {
			expect(validarEnlace('https://fb.me/abc', REGLA_FACEBOOK)).toBeUndefined();
		});
	});
});

describe('validarLocal', () => {
	it('acepta lo mínimo y rellena el resto con valores vacíos', () => {
		const resultado = validarLocal(formulario(BASE));

		expect(resultado).toEqual({
			ok: true,
			datos: {
				esloganEs: '',
				esloganEn: null,
				descripcionEs: '',
				descripcionEn: null,
				telefono: null,
				whatsapp: null,
				direccion: BASE.direccion,
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
				servicios: { wifi: false, petFriendly: false, banos: false, paraLlevar: false, consumoLocal: false },
				horario: {},
			},
		});
	});

	it('lee teléfono, redes, servicios, coordenadas y horario', () => {
		const resultado = validarLocal(
			formulario({
				...BASE,
				telefono: '+56 9 8886 0939',
				whatsapp: '988860939',
				instagramUrl: 'https://www.instagram.com/dondesino',
				facebookUrl: 'https://www.facebook.com/dondesino',
				ubereatsUrl: 'https://www.ubereats.com/cl/store/donde-si-no',
				mapsUrl: 'https://www.google.com/maps/place/Donde+Si+No',
				resenaUrl: 'https://g.page/r/abc/review',
				latitud: '-33,7123',
				longitud: '-71.2',
				codigoPostal: '9580000',
				rangoPrecio: ' $5.000–10.000 ',
				servicios: ['wifi', 'banos', 'wifi'],
				horario_lun_abre1: '12:00',
				horario_lun_cierra1: '01:00',
			}),
		);

		expect(resultado).toMatchObject({
			ok: true,
			datos: {
				telefono: '+56988860939',
				whatsapp: '+56988860939',
				instagramUrl: 'https://www.instagram.com/dondesino',
				latitud: -33.7123,
				longitud: -71.2,
				codigoPostal: '9580000',
				rangoPrecio: '$5.000–10.000',
				servicios: { wifi: true, petFriendly: false, banos: true, paraLlevar: false, consumoLocal: false },
				horario: { lun: [{ abre: '12:00', cierra: '01:00' }] },
			},
		});
	});

	it('exige dirección, comuna y región', () => {
		const resultado = validarLocal(formulario({ direccion: ' ', comuna: '', region: '' }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['comuna', 'direccion', 'region']);
	});

	it('rechaza enlaces inseguros o de otro sitio, con un mensaje claro', () => {
		const resultado = validarLocal(
			formulario({ ...BASE, instagramUrl: 'http://instagram.com/x', facebookUrl: 'javascript:alert(1)', ubereatsUrl: 'https://evil.com' }),
		);

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['facebookUrl', 'instagramUrl', 'ubereatsUrl']);
		expect(resultado.errores.instagramUrl).toMatch(/https:\/\//);
	});

	it('valida teléfono, código postal y coordenadas', () => {
		const resultado = validarLocal(
			formulario({ ...BASE, telefono: '123', codigoPostal: 'abc', latitud: '95', longitud: '-71' }),
		);

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['codigoPostal', 'latitud', 'telefono']);
	});

	it('pide ambas coordenadas o ninguna', () => {
		const resultado = validarLocal(formulario({ ...BASE, latitud: '-33.7' }));

		expect(resultado).toMatchObject({ ok: false, errores: { longitud: expect.stringMatching(/ambas|también/i) } });
	});

	it('informa juntos el error de coordenadas y el de otros campos (no en dos rondas)', () => {
		const resultado = validarLocal(formulario({ ...BASE, telefono: '123', latitud: '-33.7' }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['longitud', 'telefono']);
	});

	it('rechaza un servicio desconocido', () => {
		const resultado = validarLocal(formulario({ ...BASE, servicios: ['piscina'] }));

		expect(resultado).toMatchObject({ ok: false, errores: { servicios: expect.any(String) } });
	});

	it('combina los errores del horario con los demás', () => {
		const resultado = validarLocal(formulario({ direccion: '', comuna: 'x', region: 'y', horario_lun_abre1: '12:00' }));

		expect(resultado.ok).toBe(false);
		if (resultado.ok) return;
		expect(Object.keys(resultado.errores).sort()).toEqual(['direccion', 'horario_lun']);
	});
});
