/**
 * Comprueba que las variables de entorno de producción estén completas y bien formadas ANTES de desplegar
 * (`npm run entorno:verificar`). Un error de copiar y pegar (un espacio, unas comillas, la contraseña en vez de su hash)
 * se descubriría de otro modo cuando la carta ya está publicada. Nunca repite el valor de un secreto en sus mensajes.
 */

export interface Observacion {
	variable: string;
	mensaje: string;
}

export interface ResultadoEntorno {
	ok: boolean;
	/** Impiden desplegar. */
	problemas: Observacion[];
	/** Conviene revisarlas, pero no bloquean. */
	avisos: Observacion[];
}

type Entorno = Record<string, string | undefined>;

const LARGO_MINIMO_SESSION_SECRET = 32;
const LARGO_MINIMO_ISR_BYPASS_TOKEN = 32; // lo exige Vercel
const LARGO_MINIMO_CRON_SECRET = 16; // lo exige Vercel
const FORMATO_HASH = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/;
const FORMATO_TOKEN_BLOB = /^vercel_blob_rw_[A-Za-z0-9]+_/;
const SECRETOS_QUE_DEBEN_SER_DISTINTOS = ['SESSION_SECRET', 'ISR_BYPASS_TOKEN', 'CRON_SECRET'] as const;

const tieneEspaciosOComillas = (valor: string): boolean => valor !== valor.trim() || /^["'`]|["'`]$/.test(valor);

export function validarEntorno(entorno: Entorno): ResultadoEntorno {
	const problemas: Observacion[] = [];
	const avisos: Observacion[] = [];
	const problema = (variable: string, mensaje: string): void => void problemas.push({ variable, mensaje });

	/** Devuelve el valor solo si existe y no trae espacios ni comillas; en otro caso registra el problema. */
	const leer = (variable: string): string | undefined => {
		const valor = entorno[variable];
		if (valor === undefined || valor === '') {
			problema(variable, `Falta ${variable}.`);
			return undefined;
		}
		if (tieneEspaciosOComillas(valor)) {
			problema(variable, `${variable} tiene espacios, saltos de línea o comillas al principio o al final (suele pasar al copiar y pegar). Pega solo el valor.`);
			return undefined;
		}
		return valor;
	};

	const url = leer('TURSO_DATABASE_URL');
	if (url !== undefined && !/^(libsql|https):\/\//.test(url)) {
		problema('TURSO_DATABASE_URL', 'TURSO_DATABASE_URL debe ser la dirección de la base en Turso (empieza con libsql://). En Vercel el disco es efímero: un archivo local no sirve.');
	}

	const tokenTurso = leer('TURSO_AUTH_TOKEN');
	if (tokenTurso !== undefined && !tokenTurso.startsWith('eyJ')) {
		avisos.push({ variable: 'TURSO_AUTH_TOKEN', mensaje: 'El token de Turso no parece un token JWT (suele empezar con «eyJ»). Revisa que sea el de la base correcta.' });
	}

	const tokenBlob = leer('BLOB_READ_WRITE_TOKEN');
	if (tokenBlob !== undefined && !FORMATO_TOKEN_BLOB.test(tokenBlob)) {
		problema('BLOB_READ_WRITE_TOKEN', 'BLOB_READ_WRITE_TOKEN no tiene el formato de Vercel Blob (vercel_blob_rw_…). Sale al crear el store en Vercel → Storage.');
	}

	const hash = leer('ADMIN_PASSWORD_HASH');
	if (hash !== undefined && !FORMATO_HASH.test(hash)) {
		problema('ADMIN_PASSWORD_HASH', 'ADMIN_PASSWORD_HASH no es un hash válido. No pegues la contraseña: genera el hash con `npm run admin:hash`.');
	}

	const secretos = new Map<string, string>();
	for (const [variable, minimo] of [
		['SESSION_SECRET', LARGO_MINIMO_SESSION_SECRET],
		['ISR_BYPASS_TOKEN', LARGO_MINIMO_ISR_BYPASS_TOKEN],
		['CRON_SECRET', LARGO_MINIMO_CRON_SECRET],
	] as const) {
		const valor = leer(variable);
		if (valor === undefined) continue;
		if (valor.length < minimo) problema(variable, `${variable} debe tener al menos ${minimo} caracteres (tiene ${valor.length}).`);
		else secretos.set(variable, valor);
	}

	// Un mismo valor en dos secretos haría que filtrar uno comprometa también el otro.
	for (const variable of SECRETOS_QUE_DEBEN_SER_DISTINTOS) {
		const valor = secretos.get(variable);
		if (valor === undefined) continue;
		const repetida = [...secretos].some(([otra, otroValor]) => otra !== variable && otroValor === valor);
		if (repetida) problema(variable, `${variable} debe ser distinto de los demás secretos: usa un valor aleatorio propio para cada uno.`);
	}

	return { ok: problemas.length === 0, problemas, avisos };
}
