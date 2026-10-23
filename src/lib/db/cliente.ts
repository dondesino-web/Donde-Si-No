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

const ESPERA_ARCHIVO_BLOQUEADO_MS = 5000;

/**
 * Igual que {@link crearClienteBd}, pero con la conexión lista para usarse. En un archivo local varias conexiones
 * (el servidor, scripts, pruebas) pueden coincidir: se configura que esperen su turno unos segundos en vez de fallar
 * al instante con SQLITE_BUSY. Hay que esperar la configuración antes del primer uso: lanzada en paralelo con la primera
 * consulta, libsql la pierde. Las bases remotas (Turso) no tienen este problema.
 */
export async function abrirBd(config: ConfigBd): Promise<{ bd: Bd; cliente: Client }> {
	const conexion = crearClienteBd(config);
	if (config.url.startsWith('file:')) {
		await conexion.cliente.execute(`pragma busy_timeout = ${ESPERA_ARCHIVO_BLOQUEADO_MS}`);
		// WAL: las lecturas no bloquean las escrituras ni al revés. En el modo por defecto, una lectura que pasa a escritura
		// mientras otra conexión escribe falla al instante con SQLITE_BUSY, sin esperar siquiera el tiempo configurado.
		await conexion.cliente.execute('pragma journal_mode = wal');
	}
	return conexion;
}

/** Crea la conexión a Turso/libSQL. Recibe la configuración explícita para poder usarse en tests y scripts. */
export function crearClienteBd(config: ConfigBd): { bd: Bd; cliente: Client } {
	if (!config.url) throw new Error('Falta la URL de la base de datos (TURSO_DATABASE_URL).');

	const cliente = createClient({ url: config.url, authToken: config.authToken });
	const bd = drizzle({ client: cliente, schema: esquema, casing: 'snake_case' });
	return { bd, cliente };
}
