/** Tipos del dominio de la carta, compartidos por la base de datos, el panel y la carta pública. */

export const DIAS_SEMANA = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

/** Rango en hora local de Chile (`HH:MM`). Si `cierra` es menor que `abre`, cruza la medianoche. */
export interface RangoHorario {
	abre: string;
	cierra: string;
}

/** Días sin rangos = cerrado. Un horario vacío significa «por confirmar». */
export type Horario = Partial<Record<DiaSemana, RangoHorario[]>>;

export interface Servicios {
	wifi: boolean;
	petFriendly: boolean;
	banos: boolean;
	paraLlevar: boolean;
	consumoLocal: boolean;
}

/** Alérgenos comunes. Se muestran siempre en texto; el ícono es decorativo. */
export const ALERGENOS = [
	'gluten',
	'huevo',
	'leche',
	'soya',
	'mani',
	'frutos_secos',
	'pescado',
	'mariscos',
	'sulfitos',
] as const;
export type Alergeno = (typeof ALERGENOS)[number];

export const ETIQUETAS = ['vegetariano', 'picante', 'nuevo'] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

/** Eventos que cuentan las estadísticas. La base rechaza cualquier otro (evita que se llene de basura). */
export const EVENTOS_ESTADISTICA = [
	'visita',
	'qr_escaneo',
	'clic_llamar',
	'clic_mapa',
	'clic_resena',
	'clic_ubereats',
	'clic_compartir',
	'idioma_en',
] as const;
export type EventoEstadistica = (typeof EVENTOS_ESTADISTICA)[number];

/** Foto ya comprimida en el navegador y subida en dos tamaños (WebP). */
export interface Imagen {
	sm: string;
	lg: string;
	ancho: number;
	alto: number;
	altEs: string;
	altEn?: string;
}
