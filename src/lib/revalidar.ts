export const RUTAS_PUBLICAS = ['/', '/en/', '/imprimir', '/en/print'] as const;

const TIEMPO_MAXIMO_MS = 5000;

export type Peticion = (
	url: string,
	init: { method: 'HEAD'; headers: Record<string, string>; redirect: 'manual'; signal: AbortSignal },
) => Promise<Response>;

export interface OpcionesRevalidar {
	/** Origen del sitio, sin barra final. */
	sitio: string;
	/** `ISR_BYPASS_TOKEN`. Sin token (desarrollo local) no hay caché que invalidar. */
	token: string | undefined;
	peticion?: Peticion;
}

export interface ResultadoRevalidar {
	ok: boolean;
	/** `true` cuando no había token y no se hizo ninguna petición. */
	omitido: boolean;
	fallidas: string[];
}

/**
 * Invalida la caché ISR de Vercel de las páginas públicas (HEAD con `x-prerender-revalidate`).
 * Nunca lanza: un fallo aquí no debe deshacer ni ocultar un cambio que ya se guardó en la base.
 */
export async function revalidar({ sitio, token, peticion = fetch }: OpcionesRevalidar): Promise<ResultadoRevalidar> {
	if (!token) return { ok: true, omitido: true, fallidas: [] };

	const resultados = await Promise.all(
		RUTAS_PUBLICAS.map(async (ruta) => {
			try {
				// Sin seguir redirecciones (el token no debe viajar a otro host) y con tope de tiempo: guardar no puede quedar colgado.
				const respuesta = await peticion(`${sitio}${ruta}`, {
					method: 'HEAD',
					headers: { 'x-prerender-revalidate': token },
					redirect: 'manual',
					signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
				});
				return respuesta.ok ? null : ruta;
			} catch {
				return ruta;
			}
		}),
	);
	const fallidas = resultados.filter((ruta): ruta is (typeof RUTAS_PUBLICAS)[number] => ruta !== null);
	return { ok: fallidas.length === 0, omitido: false, fallidas };
}
