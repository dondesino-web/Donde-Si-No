CREATE TABLE `categoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`nombre_es` text NOT NULL,
	`nombre_en` text,
	`orden` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categoria_slug_unique` ON `categoria` (`slug`);--> statement-breakpoint
CREATE TABLE `estadistica_diaria` (
	`fecha` text NOT NULL,
	`evento` text NOT NULL,
	`conteo` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`fecha`, `evento`),
	CONSTRAINT "estadistica_evento_conocido" CHECK("estadistica_diaria"."evento" in ('visita', 'qr_escaneo', 'clic_llamar', 'clic_mapa', 'clic_resena', 'clic_ubereats', 'clic_compartir', 'idioma_en'))
);
--> statement-breakpoint
CREATE TABLE `foto_destacada` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`imagen` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intento_login` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`ventana_inicio` integer NOT NULL,
	`conteo` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `intento_login_ventana_idx` ON `intento_login` (`ventana_inicio`);--> statement-breakpoint
CREATE TABLE `menu_dia` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo_es` text NOT NULL,
	`titulo_en` text,
	`descripcion_es` text DEFAULT '' NOT NULL,
	`descripcion_en` text,
	`precio` integer,
	`fecha` text,
	`activo` integer DEFAULT false NOT NULL,
	CONSTRAINT "menu_dia_precio_no_negativo" CHECK("menu_dia"."precio" >= 0)
);
--> statement-breakpoint
CREATE TABLE `negocio` (
	`id` integer PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`eslogan_es` text DEFAULT '' NOT NULL,
	`eslogan_en` text,
	`descripcion_es` text DEFAULT '' NOT NULL,
	`descripcion_en` text,
	`telefono` text,
	`whatsapp` text,
	`direccion` text NOT NULL,
	`comuna` text NOT NULL,
	`region` text NOT NULL,
	`codigo_postal` text,
	`pais` text DEFAULT 'CL' NOT NULL,
	`latitud` real,
	`longitud` real,
	`maps_url` text,
	`resena_url` text,
	`instagram_url` text,
	`facebook_url` text,
	`ubereats_url` text,
	`rango_precio` text,
	`servicios` text NOT NULL,
	`horario` text DEFAULT '{}' NOT NULL,
	`actualizado_en` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "negocio_fila_unica" CHECK("negocio"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `producto` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer NOT NULL,
	`nombre_es` text NOT NULL,
	`nombre_en` text,
	`descripcion_es` text DEFAULT '' NOT NULL,
	`descripcion_en` text,
	`precio` integer,
	`imagen` text,
	`alergenos` text DEFAULT '[]' NOT NULL,
	`etiquetas` text DEFAULT '[]' NOT NULL,
	`disponible` integer DEFAULT true NOT NULL,
	`destacado` integer DEFAULT false NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`actualizado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "producto_precio_no_negativo" CHECK("producto"."precio" >= 0)
);
--> statement-breakpoint
CREATE INDEX `producto_categoria_orden_idx` ON `producto` (`categoria_id`,`orden`);--> statement-breakpoint
CREATE TABLE `promocion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo_es` text NOT NULL,
	`titulo_en` text,
	`descripcion_es` text DEFAULT '' NOT NULL,
	`descripcion_en` text,
	`precio` integer,
	`imagen` text,
	`activa` integer DEFAULT true NOT NULL,
	`desde` text,
	`hasta` text,
	`orden` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "promocion_precio_no_negativo" CHECK("promocion"."precio" >= 0)
);
