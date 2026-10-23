import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from 'astro:env/server';
import { abrirBd, validarConfigBd, type Bd } from './cliente.ts';

// Se abre una vez al cargar el módulo (con espera de arranque): así la primera consulta ya encuentra la conexión configurada.
const { bd } = await abrirBd(validarConfigBd({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN }, import.meta.env.PROD));

/** Conexión compartida de la aplicación, configurada con las variables de entorno validadas por Astro. */
export function obtenerBd(): Bd {
	return bd;
}
