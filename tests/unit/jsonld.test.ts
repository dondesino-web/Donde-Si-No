import { describe, expect, it } from 'vitest';
import { construirJsonLd, serializarJsonLd } from '../../src/lib/seo/jsonld.ts';
import { cartaDePrueba, categoriaDePrueba, negocioDePrueba, productoDePrueba } from '../ayudantes/carta.ts';

const SITIO = 'https://www.donde-sino.com';

describe('construirJsonLd', () => {
	it('describe el restaurante con dirección, teléfono y logo', () => {
		const datos = construirJsonLd(cartaDePrueba(), 'es', SITIO);

		expect(datos).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'Restaurant',
			'@id': `${SITIO}/#restaurante`,
			name: 'Dónde Si No',
			url: `${SITIO}/`,
			logo: `${SITIO}/marca/logo-512.jpg`,
			telephone: '+56988860939',
			priceRange: '$5.000–10.000',
			address: {
				'@type': 'PostalAddress',
				streetAddress: 'Ruta G60 Km 3 (Camino a Rapel), Chocalán',
				addressLocality: 'Melipilla',
				addressRegion: 'Región Metropolitana',
				addressCountry: 'CL',
			},
		});
		expect(datos).not.toHaveProperty('address.postalCode');
	});

	it('incluye la carta con secciones y precios en CLP solo cuando hay precio', () => {
		const carta = cartaDePrueba({
			categorias: [
				categoriaDePrueba({
					productos: [productoDePrueba({ nombreEs: 'Churrasco', precio: 4500 }), productoDePrueba({ id: 2, nombreEs: 'As', precio: null })],
				}),
			],
		});

		const menu = construirJsonLd(carta, 'es', SITIO).hasMenu as Record<string, unknown>;

		expect(menu).toMatchObject({
			'@type': 'Menu',
			inLanguage: 'es-CL',
			hasMenuSection: [
				{
					'@type': 'MenuSection',
					name: 'Churrascos',
					hasMenuItem: [
						{ '@type': 'MenuItem', name: 'Churrasco', offers: { '@type': 'Offer', price: '4500', priceCurrency: 'CLP' } },
						{ '@type': 'MenuItem', name: 'As' },
					],
				},
			],
		});
		const items = (menu.hasMenuSection as { hasMenuItem: Record<string, unknown>[] }[])[0].hasMenuItem;
		expect(items[1]).not.toHaveProperty('offers');
	});

	it('marca como agotado lo que no está disponible', () => {
		const carta = cartaDePrueba({ categorias: [categoriaDePrueba({ productos: [productoDePrueba({ disponible: false })] })] });

		const menu = construirJsonLd(carta, 'es', SITIO).hasMenu as { hasMenuSection: { hasMenuItem: { offers: { availability: string } }[] }[] };

		expect(menu.hasMenuSection[0].hasMenuItem[0].offers.availability).toBe('https://schema.org/OutOfStock');
	});

	it('usa los textos en inglés con respaldo en español', () => {
		const carta = cartaDePrueba({
			categorias: [categoriaDePrueba({ nombreEn: 'Sandwiches', productos: [productoDePrueba({ nombreEs: 'Chorrillana', nombreEn: null })] })],
		});

		const datos = construirJsonLd(carta, 'en', SITIO);

		expect(datos).toMatchObject({
			url: `${SITIO}/en/`,
			description: 'Fast food in Chocalán.',
			hasMenu: { inLanguage: 'en', hasMenuSection: [{ name: 'Sandwiches', hasMenuItem: [{ name: 'Chorrillana' }] }] },
		});
	});

	it('traduce el horario a la especificación de schema.org', () => {
		const carta = cartaDePrueba({
			negocio: negocioDePrueba({ horario: { lun: [{ abre: '12:00', cierra: '01:00' }], dom: [] } }),
		});

		expect(construirJsonLd(carta, 'es', SITIO).openingHoursSpecification).toEqual([
			{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Monday', opens: '12:00', closes: '01:00' },
		]);
	});

	it('enlaza solo las redes que existen', () => {
		const carta = cartaDePrueba({
			negocio: negocioDePrueba({ instagramUrl: 'https://www.instagram.com/dondesino', ubereatsUrl: null }),
		});

		expect(construirJsonLd(carta, 'es', SITIO).sameAs).toEqual(['https://www.instagram.com/dondesino']);
	});
});

describe('serializarJsonLd', () => {
	it('escapa caracteres que podrían cerrar la etiqueta <script>', () => {
		const texto = serializarJsonLd({ name: '</script><script>alert(1)</script>' });

		expect(texto).not.toContain('<');
		expect(texto).not.toContain('>');
		expect(JSON.parse(texto)).toEqual({ name: '</script><script>alert(1)</script>' });
	});
});
