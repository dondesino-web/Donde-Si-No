/**
 * Carga la carta leída de los carteles del local (`npm run db:carta`).
 *
 * Sin opciones solo MUESTRA lo que haría y no escribe nada. Para escribir: `npm run db:carta -- --aplicar`.
 * Apunta a la base de TURSO_DATABASE_URL (o al archivo local si no está definida) y la muestra antes de empezar.
 */
import { abrirBd } from '../src/lib/db/cliente.ts';
import { cargarCarta } from '../src/lib/db/cargaCarta.ts';

const aplicar = process.argv.includes('--aplicar');
const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const { bd, cliente } = await abrirBd({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

console.info(`Base de datos: ${url.startsWith('file:') ? url : new URL(url).host}`);
console.info(aplicar ? 'Modo: ESCRIBIR' : 'Modo: prueba (no se escribe nada). Agrega --aplicar para cargar.');

try {
	const r = await cargarCarta(bd, { aplicar });
	console.info(`
Categorías nuevas:        ${r.categoriasNuevas}
Productos nuevos:         ${r.productosNuevos}
Precios completados:      ${r.preciosCompletados}
Productos genéricos retirados: ${r.productosRetirados}
Promociones nuevas:       ${r.promocionesNuevas}
Promociones completadas:  ${r.promocionesActualizadas}
${aplicar ? 'Listo: cargado.' : 'Nada se escribió.'}`);
} finally {
	cliente.close();
}
