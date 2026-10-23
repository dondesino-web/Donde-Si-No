import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		directorioTemporal: string;
	}
}

/*
 * En Windows, libsql mantiene abierto el archivo de la base hasta que termina el proceso,
 * así que los archivos temporales se borran aquí, cuando los workers ya terminaron.
 */
export default function setup(project: TestProject): () => void {
	const directorio = mkdtempSync(join(tmpdir(), 'dondesino-pruebas-'));
	project.provide('directorioTemporal', directorio);

	return () => {
		try {
			rmSync(directorio, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
		} catch (error) {
			// No debe tumbar una suite que pasó: solo queda basura en la carpeta temporal del sistema.
			console.warn(`No se pudo borrar ${directorio}:`, error);
		}
	};
}
