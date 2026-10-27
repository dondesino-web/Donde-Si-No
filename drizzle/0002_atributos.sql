CREATE TABLE `atributo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`clave` text NOT NULL,
	`nombre_es` text NOT NULL,
	`nombre_en` text,
	`orden` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "atributo_tipo_conocido" CHECK("atributo"."tipo" in ('alergeno', 'etiqueta'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `atributo_tipo_clave_idx` ON `atributo` (`tipo`,`clave`);
--> statement-breakpoint
INSERT INTO `atributo` (`tipo`, `clave`, `nombre_es`, `nombre_en`, `orden`) VALUES
	('alergeno', 'gluten', 'gluten', 'gluten', 0),
	('alergeno', 'huevo', 'huevo', 'egg', 1),
	('alergeno', 'leche', 'leche', 'milk', 2),
	('alergeno', 'soya', 'soya', 'soy', 3),
	('alergeno', 'mani', 'maní', 'peanuts', 4),
	('alergeno', 'frutos_secos', 'frutos secos', 'tree nuts', 5),
	('alergeno', 'pescado', 'pescado', 'fish', 6),
	('alergeno', 'mariscos', 'mariscos', 'shellfish', 7),
	('alergeno', 'sulfitos', 'sulfitos', 'sulphites', 8),
	('etiqueta', 'vegetariano', 'Vegetariano', 'Vegetarian', 0),
	('etiqueta', 'picante', 'Picante', 'Spicy', 1),
	('etiqueta', 'nuevo', 'Nuevo', 'New', 2);
