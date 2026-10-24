import type {
	CartaPublica,
	CategoriaConProductos,
	Negocio,
	Producto,
} from '../../src/lib/repositorios/cartaRepo.ts';

const FECHA = new Date('2026-10-22T12:00:00Z');

export function negocioDePrueba(cambios: Partial<Negocio> = {}): Negocio {
	return {
		id: 1,
		nombre: 'Dónde Si No',
		esloganEs: '¡Aquí hay sabor!',
		esloganEn: null,
		descripcionEs: 'Comida rápida en Chocalán.',
		descripcionEn: 'Fast food in Chocalán.',
		telefono: '+56988860939',
		whatsapp: null,
		direccion: 'Ruta G60 Km 3 (Camino a Rapel), Chocalán',
		comuna: 'Melipilla',
		region: 'Región Metropolitana',
		codigoPostal: null,
		pais: 'CL',
		latitud: null,
		longitud: null,
		mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Donde+Si+No',
		resenaUrl: null,
		instagramUrl: null,
		facebookUrl: null,
		ubereatsUrl: null,
		rangoPrecio: '$5.000–10.000',
		servicios: { wifi: true, petFriendly: true, banos: true, paraLlevar: true, consumoLocal: true },
		horario: {},
		actualizadoEn: FECHA,
		...cambios,
	};
}

export function productoDePrueba(cambios: Partial<Producto> = {}): Producto {
	return {
		id: 1,
		categoriaId: 1,
		nombreEs: 'Churrasco',
		nombreEn: null,
		descripcionEs: '',
		descripcionEn: null,
		precio: 4500,
		imagen: null,
		alergenos: [],
		etiquetas: [],
		disponible: true,
		destacado: false,
		orden: 0,
		visible: true,
		actualizadoEn: FECHA,
		...cambios,
	};
}

export function categoriaDePrueba(cambios: Partial<CategoriaConProductos> = {}): CategoriaConProductos {
	return {
		id: 1,
		slug: 'churrascos',
		nombreEs: 'Churrascos',
		nombreEn: 'Churrascos',
		orden: 0,
		visible: true,
		productos: [productoDePrueba()],
		...cambios,
	};
}

export function cartaDePrueba(cambios: Partial<CartaPublica> = {}): CartaPublica {
	return {
		negocio: negocioDePrueba(),
		categorias: [categoriaDePrueba()],
		promociones: [],
		menuDia: null,
		fotos: [],
		...cambios,
	};
}
