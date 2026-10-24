import { LOCALE, type Idioma } from '../../i18n/ui.ts';
import { rutaPagina, textoLocal } from '../../i18n/utils.ts';
import { DIAS_SEMANA, type DiaSemana, type Horario } from '../dominio/tipos.ts';
import type { CartaPublica, CategoriaConProductos, Producto } from '../repositorios/cartaRepo.ts';

type JsonLd = Record<string, unknown>;

const DIA_SCHEMA: Record<DiaSemana, string> = {
	lun: 'Monday',
	mar: 'Tuesday',
	mie: 'Wednesday',
	jue: 'Thursday',
	vie: 'Friday',
	sab: 'Saturday',
	dom: 'Sunday',
};

const horarioSchema = (horario: Horario): JsonLd[] =>
	DIAS_SEMANA.flatMap((dia) =>
		(horario[dia] ?? []).map((r) => ({
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: `https://schema.org/${DIA_SCHEMA[dia]}`,
			opens: r.abre,
			closes: r.cierra,
		})),
	);

const itemSchema = (producto: Producto, idioma: Idioma): JsonLd => {
	const descripcion = textoLocal(idioma, producto.descripcionEs, producto.descripcionEn).texto;
	return {
		'@type': 'MenuItem',
		name: textoLocal(idioma, producto.nombreEs, producto.nombreEn).texto,
		...(descripcion && { description: descripcion }),
		// Sin precio («Consultar») no se declara oferta: schema.org exige un precio válido.
		...(producto.precio !== null && {
			offers: {
				'@type': 'Offer',
				price: String(producto.precio),
				priceCurrency: 'CLP',
				availability: `https://schema.org/${producto.disponible ? 'InStock' : 'OutOfStock'}`,
			},
		}),
	};
};

const seccionSchema = (categoria: CategoriaConProductos, idioma: Idioma): JsonLd => ({
	'@type': 'MenuSection',
	name: textoLocal(idioma, categoria.nombreEs, categoria.nombreEn).texto,
	hasMenuItem: categoria.productos.map((p) => itemSchema(p, idioma)),
});

/** Datos estructurados `Restaurant` + `Menu` para los buscadores. `sitio` es el origen sin barra final. */
export function construirJsonLd(carta: CartaPublica, idioma: Idioma, sitio: string): JsonLd {
	const { negocio, categorias } = carta;
	const redes = [negocio.instagramUrl, negocio.facebookUrl, negocio.ubereatsUrl].filter((url): url is string => !!url);
	const horario = horarioSchema(negocio.horario);
	const descripcion = textoLocal(idioma, negocio.descripcionEs, negocio.descripcionEn).texto;

	return {
		'@context': 'https://schema.org',
		'@type': 'Restaurant',
		'@id': `${sitio}/#restaurante`,
		name: negocio.nombre,
		url: `${sitio}${rutaPagina(idioma, 'carta')}`,
		logo: `${sitio}/marca/logo-512.jpg`,
		...(descripcion && { description: descripcion }),
		...(negocio.telefono && { telephone: negocio.telefono }),
		...(negocio.rangoPrecio && { priceRange: negocio.rangoPrecio }),
		address: {
			'@type': 'PostalAddress',
			streetAddress: negocio.direccion,
			addressLocality: negocio.comuna,
			addressRegion: negocio.region,
			...(negocio.codigoPostal && { postalCode: negocio.codigoPostal }),
			addressCountry: negocio.pais,
		},
		...(negocio.latitud !== null &&
			negocio.longitud !== null && {
				geo: { '@type': 'GeoCoordinates', latitude: negocio.latitud, longitude: negocio.longitud },
			}),
		...(horario.length > 0 && { openingHoursSpecification: horario }),
		...(redes.length > 0 && { sameAs: redes }),
		hasMenu: {
			'@type': 'Menu',
			inLanguage: LOCALE[idioma],
			hasMenuSection: categorias.map((c) => seccionSchema(c, idioma)),
		},
	};
}

/** Serializa para incrustar en `<script type="application/ld+json">` sin que el contenido pueda cerrar la etiqueta. */
export function serializarJsonLd(datos: JsonLd): string {
	return JSON.stringify(datos)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
