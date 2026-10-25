import { sql, type SQL } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import {
	EVENTOS_ESTADISTICA,
	type Alergeno,
	type Etiqueta,
	type EventoEstadistica,
	type Horario,
	type Imagen,
	type Servicios,
} from '../dominio/tipos.ts';

// Las columnas se nombran en camelCase y Drizzle las guarda en snake_case (`casing: 'snake_case'`).
// `actualizadoEn` se renueva con `.update()`, pero NO con `onConflictDoUpdate`: en upserts hay que asignarlo a mano.

const id = () => integer().primaryKey({ autoIncrement: true });
const booleano = (porDefecto: boolean) => integer({ mode: 'boolean' }).notNull().default(porDefecto);
const actualizadoEn = () =>
	integer({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
		.$onUpdate(() => new Date());
const imagen = () => text({ mode: 'json' }).$type<Imagen>();
// En SQLite un CHECK con NULL no falla, así que `precio` puede seguir vacío («Consultar»).
const precioNoNegativo = (precio: AnySQLiteColumn): SQL => sql`${precio} >= 0`;
const listaSql = (valores: readonly string[]): SQL => sql.raw(valores.map((v) => `'${v}'`).join(', '));

/** Datos del local. Siempre una sola fila (`id = 1`). */
export const negocio = sqliteTable(
	'negocio',
	{
		id: integer().primaryKey(),
		nombre: text().notNull(),
		esloganEs: text().notNull().default(''),
		esloganEn: text(),
		descripcionEs: text().notNull().default(''),
		descripcionEn: text(),
		telefono: text(),
		whatsapp: text(),
		direccion: text().notNull(),
		comuna: text().notNull(),
		region: text().notNull(),
		codigoPostal: text(),
		pais: text().notNull().default('CL'),
		latitud: real(),
		longitud: real(),
		mapsUrl: text(),
		resenaUrl: text(),
		instagramUrl: text(),
		facebookUrl: text(),
		ubereatsUrl: text(),
		rangoPrecio: text(),
		servicios: text({ mode: 'json' }).$type<Servicios>().notNull(),
		horario: text({ mode: 'json' }).$type<Horario>().notNull().default({}),
		/** Diseño de la carta pública (ver `dominio/temas.ts`). Un valor desconocido se trata como el clásico. */
		tema: text().notNull().default('clasico'),
		actualizadoEn: actualizadoEn(),
	},
	(t) => [check('negocio_fila_unica', sql`${t.id} = 1`)],
);

export const categoria = sqliteTable('categoria', {
	id: id(),
	slug: text().notNull().unique(),
	nombreEs: text().notNull(),
	nombreEn: text(),
	orden: integer().notNull().default(0),
	visible: booleano(true),
});

export const producto = sqliteTable(
	'producto',
	{
		id: id(),
		categoriaId: integer()
			.notNull()
			.references(() => categoria.id, { onDelete: 'restrict' }),
		nombreEs: text().notNull(),
		nombreEn: text(),
		descripcionEs: text().notNull().default(''),
		descripcionEn: text(),
		/** Pesos chilenos. `null` = «Consultar». */
		precio: integer(),
		imagen: imagen(),
		alergenos: text({ mode: 'json' }).$type<Alergeno[]>().notNull().default([]),
		etiquetas: text({ mode: 'json' }).$type<Etiqueta[]>().notNull().default([]),
		/** `false` = agotado. */
		disponible: booleano(true),
		destacado: booleano(false),
		orden: integer().notNull().default(0),
		visible: booleano(true),
		actualizadoEn: actualizadoEn(),
	},
	(t) => [
		index('producto_categoria_orden_idx').on(t.categoriaId, t.orden),
		check('producto_precio_no_negativo', precioNoNegativo(t.precio)),
	],
);

export const promocion = sqliteTable(
	'promocion',
	{
		id: id(),
		tituloEs: text().notNull(),
		tituloEn: text(),
		descripcionEs: text().notNull().default(''),
		descripcionEn: text(),
		precio: integer(),
		imagen: imagen(),
		activa: booleano(true),
		/** Fechas `YYYY-MM-DD` en hora de Chile; `null` = sin límite. */
		desde: text(),
		hasta: text(),
		orden: integer().notNull().default(0),
	},
	(t) => [check('promocion_precio_no_negativo', precioNoNegativo(t.precio))],
);

export const menuDia = sqliteTable(
	'menu_dia',
	{
		id: id(),
		tituloEs: text().notNull(),
		tituloEn: text(),
		descripcionEs: text().notNull().default(''),
		descripcionEn: text(),
		precio: integer(),
		/** `YYYY-MM-DD`; `null` = se muestra cualquier día mientras esté activo. */
		fecha: text(),
		activo: booleano(false),
	},
	(t) => [check('menu_dia_precio_no_negativo', precioNoNegativo(t.precio))],
);

export const fotoDestacada = sqliteTable('foto_destacada', {
	id: id(),
	imagen: imagen().notNull(),
	orden: integer().notNull().default(0),
});

export const estadisticaDiaria = sqliteTable(
	'estadistica_diaria',
	{
		/** `YYYY-MM-DD` en hora de Chile. */
		fecha: text().notNull(),
		evento: text().$type<EventoEstadistica>().notNull(),
		conteo: integer().notNull().default(0),
	},
	(t) => [
		primaryKey({ columns: [t.fecha, t.evento] }),
		check('estadistica_evento_conocido', sql`${t.evento} in (${listaSql(EVENTOS_ESTADISTICA)})`),
	],
);

export const intentoLogin = sqliteTable(
	'intento_login',
	{
		/** HMAC de la IP con un secreto del servidor: nunca se guarda la IP en claro ni un hash reversible. */
		ipHash: text().primaryKey(),
		ventanaInicio: integer({ mode: 'timestamp' }).notNull(),
		conteo: integer().notNull().default(0),
	},
	// Permite purgar ventanas vencidas sin recorrer toda la tabla.
	(t) => [index('intento_login_ventana_idx').on(t.ventanaInicio)],
);
