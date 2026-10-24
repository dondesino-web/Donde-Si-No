import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { inject } from 'vitest';
import { crearClienteBd, type Bd } from '../../src/lib/db/cliente.ts';

export interface BdPrueba {
	bd: Bd;
	cerrar: () => void;
}

/** Base de datos SQLite temporal con las migraciones reales aplicadas. Se borra al terminar la suite. */
export async function crearBdPrueba(): Promise<BdPrueba> {
	const url = pathToFileURL(join(inject('directorioTemporal'), `${randomUUID()}.db`)).href;
	const { bd, cliente } = crearClienteBd({ url });
	await migrate(bd, { migrationsFolder: 'drizzle' });

	return { bd, cerrar: () => cliente.close() };
}
