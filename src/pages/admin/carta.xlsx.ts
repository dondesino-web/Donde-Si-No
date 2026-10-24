import type { APIRoute } from 'astro';
import { obtenerBd } from '../../lib/db/index.ts';
import { fechaLocalISO } from '../../lib/dominio/horario.ts';
import { generarPlanilla } from '../../lib/excel/generar.ts';
import { listarCartaAdmin } from '../../lib/repositorios/adminCartaRepo.ts';

/** Descarga la planilla con la carta de este momento. El middleware exige sesión: viene bajo /admin. */
export const GET: APIRoute = async () => {
	const hoy = fechaLocalISO(new Date());
	const archivo = await generarPlanilla(await listarCartaAdmin(obtenerBd()), hoy.split('-').reverse().join('-'));

	return new Response(new Uint8Array(archivo), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="Carta-Donde-Si-No-${hoy}.xlsx"`,
			'Cache-Control': 'no-store',
		},
	});
};
