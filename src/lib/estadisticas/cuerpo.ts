/**
 * Lee el cuerpo de una petición como texto, pero se detiene en cuanto supera `maximo` bytes (devuelve `undefined`).
 * `Content-Length` lo declara quien envía y con `Transfer-Encoding: chunked` ni siquiera existe: el tope se aplica
 * mientras se lee, así un cuerpo enorme nunca llega a memoria.
 */
export async function leerCuerpoLimitado(peticion: Request, maximo: number): Promise<string | undefined> {
	const lector = peticion.body?.getReader();
	if (!lector) return '';

	const partes: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await lector.read();
		if (done) break;
		total += value.byteLength;
		if (total > maximo) {
			await lector.cancel();
			return undefined;
		}
		partes.push(value);
	}

	const completo = new Uint8Array(total);
	let posicion = 0;
	for (const parte of partes) {
		completo.set(parte, posicion);
		posicion += parte.byteLength;
	}
	return new TextDecoder().decode(completo);
}
