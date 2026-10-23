import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from 'astro:env/server';
import { crearClienteBd, validarConfigBd, type Bd } from './cliente.ts';

let instancia: Bd | undefined;

/** Conexión compartida de la aplicación, configurada con las variables de entorno validadas por Astro. */
export function obtenerBd(): Bd {
	instancia ??= crearClienteBd(
		validarConfigBd({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN }, import.meta.env.PROD),
	).bd;
	return instancia;
}
