import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/*
 * Formato guardado: `scrypt$N$r$p$sal$hash` (sal y hash en base64). Los parámetros viajan dentro del
 * hash, así que se pueden endurecer más adelante sin invalidar las contraseñas ya generadas.
 */
const PREFIJO = 'scrypt';
const COSTE = 2 ** 15;
const BLOQUE = 8;
const PARALELISMO = 1;
const LARGO_SAL = 16;
const LARGO_HASH = 32;
const LARGO_MINIMO_PASSWORD = 12;
// Evita derivar contraseñas gigantes enviadas por un atacante.
const LARGO_MAXIMO_PASSWORD = 256;
// Límites para no gastar memoria ni CPU si el valor guardado estuviera corrupto.
const COSTE_MAXIMO = 2 ** 20;
const MEMORIA_MAXIMA = 256 * 1024 * 1024;

function derivar(password: string, sal: Buffer, largo: number, coste: number, bloque: number, paralelismo: number): Promise<Buffer> {
	return new Promise((resolver, rechazar) => {
		scrypt(
			password.normalize('NFKC'),
			sal,
			largo,
			{ N: coste, r: bloque, p: paralelismo, maxmem: MEMORIA_MAXIMA },
			(error, clave) => (error ? rechazar(error) : resolver(clave)),
		);
	});
}

export async function hashearPassword(password: string): Promise<string> {
	if (password.length < LARGO_MINIMO_PASSWORD) {
		throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
	}
	const sal = randomBytes(LARGO_SAL);
	const hash = await derivar(password, sal, LARGO_HASH, COSTE, BLOQUE, PARALELISMO);
	return [PREFIJO, COSTE, BLOQUE, PARALELISMO, sal.toString('base64'), hash.toString('base64')].join('$');
}

const esEnteroPositivo = (valor: number): boolean => Number.isInteger(valor) && valor > 0;

/** Devuelve `false` (nunca lanza) si el hash guardado está mal formado, para que un error de configuración no abra el panel. */
export async function verificarPassword(password: string, almacenado: string): Promise<boolean> {
	if (password.length > LARGO_MAXIMO_PASSWORD) return false;

	const [prefijo, n, r, p, salB64, hashB64, sobrante] = almacenado.split('$');
	if (prefijo !== PREFIJO || !hashB64 || sobrante !== undefined) return false;

	const coste = Number(n);
	const bloque = Number(r);
	const paralelismo = Number(p);
	const sal = Buffer.from(salB64, 'base64');
	const esperado = Buffer.from(hashB64, 'base64');
	const parametrosValidos =
		[coste, bloque, paralelismo].every(esEnteroPositivo) &&
		coste <= COSTE_MAXIMO &&
		(coste & (coste - 1)) === 0 &&
		sal.length >= 8 &&
		esperado.length >= 16;
	if (!parametrosValidos) return false;

	try {
		const calculado = await derivar(password, sal, esperado.length, coste, bloque, paralelismo);
		return timingSafeEqual(calculado, esperado);
	} catch {
		return false;
	}
}
