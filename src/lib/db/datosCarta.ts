/*
 * Carta y promociones leídas de las fotos de los carteles del local (2026-10-24).
 * Regla: lo que no se lee con claridad queda en `null` («Consultar») y el dueño lo completa en el panel.
 * Los precios son pesos chilenos. Los carteles con espacios en blanco para escribir el precio dejan ese producto en `null`.
 */

export interface ProductoCarta {
	nombreEs: string;
	descripcionEs?: string;
	precio: number | null;
}

export interface CategoriaCarta {
	slug: string;
	nombreEs: string;
	nombreEn: string;
	productos: readonly ProductoCarta[];
	/** Productos genéricos de la semilla que las variantes de arriba reemplazan (solo se borran si nadie los editó). */
	retirar?: readonly string[];
}

export interface PromocionCarta {
	tituloEs: string;
	descripcionEs: string;
	precio: number;
}

const COMPLETO = 'Italiano, tomate con mayonesa o dinámico.';
const AGREGADO = 'Incluye agregado (puré de papas, arroz, papas mayo o papas fritas), ensalada rallada y pan con pebre.';
const SABORES_FAJITA = 'Armá a tu gusto: hasta 3 ingredientes. Incluye papas fritas.';

const tamanos = (nombre: string, descripcionEs: string, [chica, mediana, grande]: readonly (number | null)[]): ProductoCarta[] => [
	{ nombreEs: `${nombre} chica`, descripcionEs, precio: chica ?? null },
	{ nombreEs: `${nombre} mediana`, descripcionEs, precio: mediana ?? null },
	{ nombreEs: `${nombre} grande`, descripcionEs, precio: grande ?? null },
];
const almuerzo = (nombreEs: string, precio: number | null): ProductoCarta => ({ nombreEs, descripcionEs: AGREGADO, precio });

const CATEGORIAS: readonly CategoriaCarta[] = [
	{
		slug: 'desayunos',
		nombreEs: 'Desayunos',
		nombreEn: 'Breakfast',
		productos: [
			// Los dos primeros nombres estaban tapados en la foto («…a de huevo»): se asumió «Tortilla».
			{ nombreEs: 'Tortilla de huevo', precio: 3500 },
			{ nombreEs: 'Tortilla de huevo con jamón y queso', precio: 4500 },
			{ nombreEs: 'Omelette', precio: 3500 },
			{ nombreEs: 'Desayuno americano', descripcionEs: 'Huevo, tocino, queso, jamón, mantequilla y pan tostado.', precio: null },
			{ nombreEs: 'Tostadas con mantequilla', precio: null },
			{ nombreEs: 'Sándwich aliado', precio: null },
			{ nombreEs: 'Sándwich ave mayo', precio: null },
			{ nombreEs: 'Sándwich ave pimentón', precio: null },
			{ nombreEs: 'Sopaipillas x3', precio: null },
			{ nombreEs: 'Empanada de queso', precio: null },
			{ nombreEs: 'Empanada de jamón y queso', precio: null },
			{ nombreEs: 'Café Dolce Gusto', descripcionEs: 'Capuccino, mocha, chococino, latte vainilla o americano.', precio: null },
			{ nombreEs: 'Café o té', precio: null },
			{ nombreEs: 'Milo', precio: null },
		],
	},
	{
		slug: 'almuerzos',
		nombreEs: 'Almuerzos',
		nombreEn: 'Lunches',
		productos: [
			almuerzo('Carne mechada', 7500),
			almuerzo('Chuleta a la plancha', 6000),
			almuerzo('Pulpa de cerdo', 7000),
			almuerzo('Costillar', 8000),
			almuerzo('Pollo asado', 6000),
			almuerzo('Pechuga a la plancha', 6000),
			almuerzo('Bistec', null), // «7.900» escrito a mano, poco claro
			almuerzo('Bistec a lo pobre', 8500),
			almuerzo('Lomo a lo pobre', 9500),
			almuerzo('Pescado frito', null),
			almuerzo('Reineta a la plancha', null),
			almuerzo('Cazuela de vacuno', 7000),
			almuerzo('Pastel de choclo', 7500),
			almuerzo('Lasagna', null),
			almuerzo('Espaguetis a la boloñesa', null),
			almuerzo('Espaguetis con salsa blanca', null),
		],
	},
	{
		slug: 'churrascos',
		nombreEs: 'Churrascos',
		nombreEn: 'Churrascos',
		productos: [
			// El cartel muestra «4.000» tachado y «6.500»: queda en Consultar hasta que el dueño confirme.
			{ nombreEs: 'Churrasco', descripcionEs: 'Vacuno, lomito o pollo. Italiano, chacarero o luco.', precio: null },
		],
	},
	{
		slug: 'completos',
		nombreEs: 'Completos y as',
		nombreEn: 'Completos & as (Chilean hot dogs)',
		productos: [
			{ nombreEs: 'Completo grande', descripcionEs: COMPLETO, precio: 2500 },
			{ nombreEs: 'Completo chico', descripcionEs: COMPLETO, precio: 2000 },
			{ nombreEs: 'As grande', descripcionEs: COMPLETO, precio: 4000 },
			{ nombreEs: 'As chico', descripcionEs: COMPLETO, precio: 3500 },
			{ nombreEs: 'Perro caliente grande', precio: 3000 },
			{ nombreEs: 'Perro caliente chico', precio: 2500 },
			{ nombreEs: 'Handroll (1 unidad)', precio: 4000 },
			{ nombreEs: 'Handroll (2 unidades)', precio: 7000 },
		],
		retirar: ['Completo', 'As'],
	},
	{
		slug: 'hamburguesas',
		nombreEs: 'Hamburguesas',
		nombreEn: 'Burgers',
		productos: [
			{ nombreEs: 'Hamburguesa italiana con papas', precio: 7000 },
			{ nombreEs: 'Hamburguesa clásica con papas', precio: 7000 },
			{ nombreEs: 'Hamburguesa suprema con papas', precio: 8000 },
			{ nombreEs: 'Hamburguesa de vacuno a tu gusto', descripcionEs: SABORES_FAJITA, precio: 7000 },
			{ nombreEs: 'Hamburguesa de pollo a tu gusto', descripcionEs: SABORES_FAJITA, precio: 7000 },
			{ nombreEs: 'Hamburguesa vegana a tu gusto', descripcionEs: SABORES_FAJITA, precio: null },
		],
		retirar: ['Hamburguesa'],
	},
	{
		slug: 'fajitas',
		nombreEs: 'Fajitas',
		nombreEn: 'Wraps',
		productos: [
			{ nombreEs: 'Fajita de pollo', descripcionEs: SABORES_FAJITA, precio: null }, // precio tapado por un adorno
			{ nombreEs: 'Fajita de lomito', descripcionEs: SABORES_FAJITA, precio: 6500 },
			{ nombreEs: 'Fajita de vacuno', descripcionEs: SABORES_FAJITA, precio: 6500 },
			{ nombreEs: 'Fajita de mechada', descripcionEs: SABORES_FAJITA, precio: 7000 },
		],
		retirar: ['Fajita'],
	},
	{
		slug: 'papas',
		nombreEs: 'Papas fritas y más',
		nombreEn: 'Fries & more',
		productos: [
			...tamanos('Papas fritas', '', [2500, 3500, 4500]),
			...tamanos('Salchipapas', '', [3500, 4500, 5500]),
			...tamanos('Papas supremas', 'Carne molida, tomate, cebollín y salsa cheddar.', [null, null, null]),
			...tamanos('Papas bacon cheese', 'Tocino y cheddar.', [null, null, null]),
			...tamanos('Salchipapa a caballo', 'Vienesas, huevo, orégano y salsas.', [null, null, null]),
			{ nombreEs: 'Chorrillana chica', precio: 7500 },
			{ nombreEs: 'Chorrillana grande', precio: 13000 },
			{ nombreEs: 'Chorrillana mixta chica', descripcionEs: 'Combina 3 carnes a elección: vacuno, pollo, lomito, mechada o chuleta ahumada.', precio: 13000 },
			{ nombreEs: 'Chorrillana mixta grande', descripcionEs: 'Combina 3 carnes a elección: vacuno, pollo, lomito, mechada o chuleta ahumada.', precio: null },
		],
		retirar: ['Papas fritas', 'Salchipapas', 'Chorrillana'],
	},
	{
		slug: 'bebidas',
		nombreEs: 'Bebidas y jugos',
		nombreEn: 'Drinks & juices',
		productos: [
			{ nombreEs: 'Bebida en lata', precio: 1300 },
			{ nombreEs: 'Agua', precio: 1000 },
			{ nombreEs: 'Express', precio: 1000 },
			{ nombreEs: 'Monster', precio: 2300 },
			{ nombreEs: 'Jugo', precio: 1300 },
			{ nombreEs: 'Jugo natural', precio: 2000 },
			{ nombreEs: 'Té', precio: 1000 },
			{ nombreEs: 'Café', precio: 1000 },
		],
		retirar: ['Bebida'],
	},
];

const PROMOCIONES: readonly PromocionCarta[] = [
	{ tituloEs: 'Combo para 1', precio: 6000, descripcionEs: 'As o churrasco (vacuno, pollo o lomito) + papas fritas + bebida, té o café.\nAgrega 3 mini empanadas por $1.000.' },
	{ tituloEs: 'Combo para 2', precio: 11500, descripcionEs: '2 ases o 2 churrascos (vacuno, pollo o lomito) + papas fritas + 2 bebidas, té o café.\nAgrega 6 mini empanadas por $2.000.' },
	{ tituloEs: 'Combo para 3', precio: 16500, descripcionEs: '3 ases o 3 churrascos (vacuno, pollo o lomito) + papas fritas + 3 bebidas, té o café.\nAgrega 6 mini empanadas por $2.000.' },
	{ tituloEs: 'Combo familiar', precio: 21990, descripcionEs: '4 ases o 4 churrascos (vacuno, pollo o lomito) + papas fritas + bebida de 1,5 litros + 4 mini empanadas de queso.' },
	{ tituloEs: 'Promo 1', precio: 4500, descripcionEs: 'Completo grande + papas fritas + bebida, té o café.' },
	{ tituloEs: 'Promo 2', precio: 4500, descripcionEs: 'Perro caliente + papas fritas + bebida, té o café.' },
	// Misma promoción que la semilla (inactiva): se actualiza en vez de duplicarla.
	{ tituloEs: 'Churrascos 2x1', precio: 6900, descripcionEs: 'Italiano, chacarero o luco.' },
	{ tituloEs: 'Promoción 2x1 mechada', precio: 7900, descripcionEs: 'Italiana, chacarera o luco.' },
];

export const DATOS_CARTA = { categorias: CATEGORIAS, promociones: PROMOCIONES } as const;
