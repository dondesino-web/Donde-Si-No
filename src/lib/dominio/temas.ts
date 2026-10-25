/**
 * Diseños de la carta pública. Todos muestran los mismos productos: cambia solo el aspecto. El dueño elige uno en el panel
 * (Diseño) y puede verlos con sus productos reales antes de decidir.
 */

export interface Tema {
	id: string;
	nombre: string;
	descripcion: string;
	/** Color de la barra del navegador en el celular. */
	colorBarra: string;
}

export const TEMAS = [
	{
		id: 'clasico',
		nombre: 'Clásico',
		descripcion: 'El diseño de siempre: encabezado azul con el logo, botones rojos y tarjetas blancas.',
		colorBarra: '#0b2a6f',
	},
	{
		id: 'bistro',
		nombre: 'Bistró',
		descripcion: 'Claro y elegante, con títulos con serifa. Cada producto es una línea limpia: nombre y descripción a la izquierda, precio a la derecha y una foto pequeña.',
		colorBarra: '#fbf5ea',
	},
	{
		id: 'noche',
		nombre: 'Noche',
		descripcion: 'Fondo oscuro con detalles dorados. Cómodo con poca luz, como dentro del local de noche, y hace resaltar las fotos.',
		colorBarra: '#14110f',
	},
	{
		id: 'fotos',
		nombre: 'Fotos',
		descripcion: 'Tarjetas con la foto grande, de dos en dos en el celular. Funciona mejor cuando cada plato tiene su foto.',
		colorBarra: '#0b2a6f',
	},
] as const satisfies readonly Tema[];

export type IdTema = (typeof TEMAS)[number]['id'];

export const TEMA_POR_DEFECTO: IdTema = 'clasico';

/** `Object.hasOwn` no sirve aquí: se compara contra la lista, así «constructor» o «__proto__» no pasan. */
export const esTema = (valor: unknown): valor is IdTema => typeof valor === 'string' && TEMAS.some((t) => t.id === valor);

/** Un valor desconocido (por ejemplo, un tema que se quitó) nunca debe romper la carta: se usa el clásico. */
export const temaOPorDefecto = (valor: unknown): IdTema => (esTema(valor) ? valor : TEMA_POR_DEFECTO);

export const buscarTema = (valor: unknown): Tema => TEMAS.find((t) => t.id === temaOPorDefecto(valor))!;
