import { claveDeNombre } from '../validacion/cargaRapida.ts';

/** Búsqueda y filtros de la lista de productos del panel. Es lógica pura: la usan la página (para contar) y el navegador. */

export type FiltroCarta = 'todos' | 'sin-precio' | 'agotados' | 'ocultos';
export type EstadoProducto = 'sin-precio' | 'agotado' | 'oculto';

interface ProductoFiltrable {
	nombreEs: string;
	descripcionEs: string;
	precio: number | null;
	disponible: boolean;
	visible: boolean;
}

/** Estado de cada filtro → estado del producto que muestra. */
const ESTADO_DE_FILTRO: Record<Exclude<FiltroCarta, 'todos'>, EstadoProducto> = {
	'sin-precio': 'sin-precio',
	agotados: 'agotado',
	ocultos: 'oculto',
};

export function estadosDe(producto: Pick<ProductoFiltrable, 'precio' | 'disponible' | 'visible'>): EstadoProducto[] {
	const estados: EstadoProducto[] = [];
	if (producto.precio === null) estados.push('sin-precio');
	if (!producto.disponible) estados.push('agotado');
	if (!producto.visible) estados.push('oculto');
	return estados;
}

/** Texto en el que se busca: nombre y descripción, sin mayúsculas ni tildes. */
export const textoBuscable = (producto: Pick<ProductoFiltrable, 'nombreEs' | 'descripcionEs'>): string =>
	claveDeNombre(`${producto.nombreEs} ${producto.descripcionEs}`);

/** ¿Se muestra el producto? Deben estar todas las palabras de la búsqueda (en cualquier orden) y cumplirse el filtro. */
export function coincideFiltro(textoNormalizado: string, estados: readonly string[], busqueda: string, filtro: FiltroCarta): boolean {
	if (filtro !== 'todos' && !estados.includes(ESTADO_DE_FILTRO[filtro])) return false;
	const palabras = claveDeNombre(busqueda).split(' ').filter(Boolean);
	return palabras.every((palabra) => textoNormalizado.includes(palabra));
}

export interface ResumenCarta {
	total: number;
	sinPrecio: number;
	agotados: number;
	ocultos: number;
}

export function resumenDeCarta(productos: readonly Pick<ProductoFiltrable, 'precio' | 'disponible' | 'visible'>[]): ResumenCarta {
	const resumen: ResumenCarta = { total: productos.length, sinPrecio: 0, agotados: 0, ocultos: 0 };
	for (const producto of productos) {
		const estados = estadosDe(producto);
		if (estados.includes('sin-precio')) resumen.sinPrecio++;
		if (estados.includes('agotado')) resumen.agotados++;
		if (estados.includes('oculto')) resumen.ocultos++;
	}
	return resumen;
}
