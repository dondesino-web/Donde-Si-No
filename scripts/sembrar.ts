/**
 * Carga los datos iniciales en la base configurada (`npm run db:seed`).
 * Requiere haber aplicado antes las migraciones (`npm run db:migrate`).
 */
import { crearClienteBd } from '../src/lib/db/cliente.ts';
import { sembrar } from '../src/lib/db/semilla.ts';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const { bd, cliente } = crearClienteBd({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

// Muestra el destino (sin credenciales) para no sembrar producción por error.
console.info(`Base de datos: ${url.startsWith('file:') ? url : new URL(url).host}`);

try {
	const { sembrado } = await sembrar(bd);
	console.info(sembrado ? 'Semilla cargada.' : 'La base ya tenía datos: no se cargó la semilla.');
} finally {
	cliente.close();
}
