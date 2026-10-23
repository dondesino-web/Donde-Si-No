import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as esquema from './esquema.ts';

export type Bd = LibSQLDatabase<typeof esquema>;

export interface ConfigBd {
	url: string;
	authToken?: string;
}

/** Impide que producción arranque contra un SQLite local: en Vercel el disco es efímero y de solo lectura. */
export function validarConfigBd(config: ConfigBd, esProduccion: boolean): ConfigBd {
	if (!esProduccion) return config;
	if (config.url.startsWith('file:')) {
		throw new Error('En producción, TURSO_DATABASE_URL debe apuntar a Turso, no a un archivo local.');
	}
	if (!config.authToken) throw new Error('En producción falta TURSO_AUTH_TOKEN.');
	return config;
}

/** Crea la conexión a Turso/libSQL. Recibe la configuración explícita para poder usarse en tests y scripts. */
export function crearClienteBd(config: ConfigBd): { bd: Bd; cliente: Client } {
	if (!config.url) throw new Error('Falta la URL de la base de datos (TURSO_DATABASE_URL).');

	const cliente = createClient({ url: config.url, authToken: config.authToken });
	const bd = drizzle({ client: cliente, schema: esquema, casing: 'snake_case' });
	return { bd, cliente };
}
