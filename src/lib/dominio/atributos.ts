import type { Idioma } from '../../i18n/ui.ts';
import { textoLocal } from '../../i18n/utils.ts';
import type { TipoAtributo } from './tipos.ts';

interface AtributoMostrable {
	tipo: TipoAtributo;
	clave: string;
	nombreEs: string;
	nombreEn: string | null;
}

/**
 * Nombres que se muestran de las claves que lleva un producto, en el idioma de la página y en el orden del producto.
 * Una clave que ya no está en el catálogo se omite: nunca se muestra el texto interno.
 */
export function nombresDeAtributos(catalogo: readonly AtributoMostrable[], tipo: TipoAtributo, claves: readonly string[], idioma: Idioma): string[] {
	const nombres: string[] = [];
	for (const clave of claves) {
		const atributo = catalogo.find((a) => a.tipo === tipo && a.clave === clave);
		if (atributo) nombres.push(textoLocal(idioma, atributo.nombreEs, atributo.nombreEn).texto);
	}
	return nombres;
}
