/**
 * Verifica las variables de entorno de producción antes de desplegar (`npm run entorno:verificar`).
 *
 * Lee `process.env`; para revisar un archivo sin cargarlo en la terminal:
 *   node --env-file=.env.produccion scripts/verificar-entorno.ts
 * No imprime nunca el valor de una variable, solo cuál falla y por qué.
 */
import { validarEntorno } from '../src/lib/entorno.ts';

const resultado = validarEntorno(process.env);

for (const { variable, mensaje } of resultado.avisos) console.warn(`⚠️  ${variable}: ${mensaje}`);
for (const { variable, mensaje } of resultado.problemas) console.error(`❌ ${variable}: ${mensaje}`);

if (resultado.ok) {
	console.info('✅ El entorno de producción está completo y bien formado.');
} else {
	console.error(`\n${resultado.problemas.length} problema(s). Corrígelos antes de desplegar.`);
	process.exitCode = 1;
}
