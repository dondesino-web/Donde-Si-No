/** Textos de la interfaz. El contenido de la carta (productos, promos…) viene de la base de datos. */

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Valor de `lang` / `inLanguage` por idioma. */
export const LOCALE: Record<Idioma, string> = { es: 'es-CL', en: 'en' };
export const LOCALE_OPEN_GRAPH: Record<Idioma, string> = { es: 'es_CL', en: 'en_US' };

const es = {
	'meta.tituloCarta': 'Carta',
	'meta.tituloImprimir': 'Carta para imprimir',
	'meta.lugar': 'Comida rápida en Chocalán, Melipilla',
	saltar: 'Saltar a la carta',
	'idioma.otro': 'English',
	'idioma.otroEtiqueta': 'English: view the menu in English',

	'estado.abierto': 'Abierto ahora',
	'estado.cierra': 'cierra a las {hora}',
	'estado.cerrado': 'Cerrado ahora',

	'acciones.etiqueta': 'Acciones rápidas',
	'accion.mapa': 'Cómo llegar',
	'accion.llamar': 'Llamar',
	'accion.resena': 'Opinar',
	'accion.compartir': 'Compartir',
	'accion.ubereats': 'Uber Eats',
	'compartir.copiado': 'Enlace copiado',
	'compartir.texto': 'Mira la carta de {nombre}',

	'servicios.titulo': 'Servicios',
	'servicio.wifi': 'Wi-Fi',
	'servicio.petFriendly': 'Pet friendly',
	'servicio.banos': 'Baños',
	'servicio.paraLlevar': 'Para llevar',
	'servicio.consumoLocal': 'Para comer aquí',

	'promos.titulo': 'Promociones',
	'menuDia.titulo': 'Menú del día',
	'galeria.titulo': 'Nuestros platos',
	'nav.etiqueta': 'Categorías de la carta',
	'carta.vacia': 'Estamos actualizando la carta. Llámanos para saber qué hay hoy.',

	'precio.consultar': 'Consultar',
	'producto.agotado': 'Agotado',
	'producto.recomendado': 'Recomendado',
	'alergenos.contiene': 'Contiene',
	'alergeno.gluten': 'gluten',
	'alergeno.huevo': 'huevo',
	'alergeno.leche': 'leche',
	'alergeno.soya': 'soya',
	'alergeno.mani': 'maní',
	'alergeno.frutos_secos': 'frutos secos',
	'alergeno.pescado': 'pescado',
	'alergeno.mariscos': 'mariscos',
	'alergeno.sulfitos': 'sulfitos',
	'etiqueta.vegetariano': 'Vegetariano',
	'etiqueta.picante': 'Picante',
	'etiqueta.nuevo': 'Nuevo',

	'pie.ubicacion': 'Ubicación',
	'pie.horario': 'Horario',
	'pie.horarioPendiente': 'Horario por confirmar: llámanos antes de venir.',
	'pie.cerrado': 'Cerrado',
	'pie.contacto': 'Contacto',
	'pie.imprimir': 'Versión para imprimir',
	'pie.precios': 'Precios en pesos chilenos.',
	'horario.rangoDias': '{desde} a {hasta}',
	'dia.lun': 'lunes',
	'dia.mar': 'martes',
	'dia.mie': 'miércoles',
	'dia.jue': 'jueves',
	'dia.vie': 'viernes',
	'dia.sab': 'sábado',
	'dia.dom': 'domingo',

	'imprimir.boton': 'Imprimir o guardar PDF',
	'imprimir.volver': 'Volver a la carta',

	'noEncontrado.titulo': 'Página no encontrada',
	'noEncontrado.texto': 'Esta página no existe, pero la carta sí.',
	'noEncontrado.enlace': 'Ver la carta',
} as const;

export type ClaveUI = keyof typeof es;

const en: Record<ClaveUI, string> = {
	'meta.tituloCarta': 'Menu',
	'meta.tituloImprimir': 'Printable menu',
	'meta.lugar': 'Fast food in Chocalán, Melipilla',
	saltar: 'Skip to the menu',
	'idioma.otro': 'Español',
	'idioma.otroEtiqueta': 'Español: ver la carta en español',

	'estado.abierto': 'Open now',
	'estado.cierra': 'closes at {hora}',
	'estado.cerrado': 'Closed now',

	'acciones.etiqueta': 'Quick actions',
	'accion.mapa': 'Directions',
	'accion.llamar': 'Call',
	'accion.resena': 'Review',
	'accion.compartir': 'Share',
	'accion.ubereats': 'Uber Eats',
	'compartir.copiado': 'Link copied',
	'compartir.texto': 'Check out the menu at {nombre}',

	'servicios.titulo': 'Amenities',
	'servicio.wifi': 'Wi-Fi',
	'servicio.petFriendly': 'Pet friendly',
	'servicio.banos': 'Restrooms',
	'servicio.paraLlevar': 'Takeaway',
	'servicio.consumoLocal': 'Dine-in',

	'promos.titulo': 'Deals',
	'menuDia.titulo': 'Today’s special',
	'galeria.titulo': 'Our food',
	'nav.etiqueta': 'Menu categories',
	'carta.vacia': 'We are updating our menu. Call us to hear what’s on today.',

	'precio.consultar': 'Ask for price',
	'producto.agotado': 'Sold out',
	'producto.recomendado': 'Recommended',
	'alergenos.contiene': 'Contains',
	'alergeno.gluten': 'gluten',
	'alergeno.huevo': 'egg',
	'alergeno.leche': 'milk',
	'alergeno.soya': 'soy',
	'alergeno.mani': 'peanuts',
	'alergeno.frutos_secos': 'tree nuts',
	'alergeno.pescado': 'fish',
	'alergeno.mariscos': 'shellfish',
	'alergeno.sulfitos': 'sulphites',
	'etiqueta.vegetariano': 'Vegetarian',
	'etiqueta.picante': 'Spicy',
	'etiqueta.nuevo': 'New',

	'pie.ubicacion': 'Location',
	'pie.horario': 'Opening hours',
	'pie.horarioPendiente': 'Opening hours to be confirmed: please call before coming.',
	'pie.cerrado': 'Closed',
	'pie.contacto': 'Contact',
	'pie.imprimir': 'Printable version',
	'pie.precios': 'Prices in Chilean pesos (CLP).',
	'horario.rangoDias': '{desde} to {hasta}',
	'dia.lun': 'Monday',
	'dia.mar': 'Tuesday',
	'dia.mie': 'Wednesday',
	'dia.jue': 'Thursday',
	'dia.vie': 'Friday',
	'dia.sab': 'Saturday',
	'dia.dom': 'Sunday',

	'imprimir.boton': 'Print or save as PDF',
	'imprimir.volver': 'Back to the menu',

	'noEncontrado.titulo': 'Page not found',
	'noEncontrado.texto': 'This page does not exist, but our menu does.',
	'noEncontrado.enlace': 'See the menu',
};

export const UI: Record<Idioma, Record<ClaveUI, string>> = { es, en };
