import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { leerPlanilla, TAMANO_MAXIMO_ARCHIVO } from '../lib/excel/leer.ts';
import { planificarCambios, type Plan } from '../lib/excel/plan.ts';
import { aplicarPlan } from '../lib/repositorios/adminPlanillaRepo.ts';
import { listarCartaAdmin } from '../lib/repositorios/adminCartaRepo.ts';
import { exigirSesion, publicar } from './ayudas.ts';

/** Lo que el panel muestra del plan antes (y después) de aplicarlo. */
export interface ResumenPlanilla {
	categoriasNuevas: string[];
	nuevos: { fila: number; nombre: string }[];
	modificados: { fila: number; nombre: string; campos: string[] }[];
	reordenadas: number;
	sinCambios: number;
	conflictos: number;
	noIncluidos: number;
	avisos: string[];
}

export type RespuestaPlanilla =
	| { ok: true; aplicado: boolean; resumen: ResumenPlanilla; mensaje: string }
	| { ok: false; errores: string[] };

const ERRORES_MOSTRADOS = 30;

function resumirPlan(plan: Plan): ResumenPlanilla {
	return {
		categoriasNuevas: plan.categoriasNuevas.map((c) => c.nombreEs),
		nuevos: plan.nuevos.map((n) => ({ fila: n.fila, nombre: n.datos.nombreEs })),
		modificados: plan.modificados.map((m) => ({ fila: m.fila, nombre: m.nombre, campos: m.campos })),
		reordenadas: plan.reordenadas,
		sinCambios: plan.sinCambios,
		conflictos: plan.conflictos.length,
		noIncluidos: plan.noIncluidos,
		avisos: plan.avisos,
	};
}

const hayCambios = (plan: Plan): boolean => plan.nuevos.length + plan.modificados.length + plan.reordenadas > 0;

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

function mensajeDeAplicacion(plan: Plan): string {
	const partes: string[] = [];
	if (plan.nuevos.length > 0) partes.push(plural(plan.nuevos.length, 'producto nuevo', 'productos nuevos'));
	if (plan.modificados.length > 0) partes.push(plural(plan.modificados.length, 'modificado', 'modificados'));
	if (plan.categoriasNuevas.length > 0) partes.push(plural(plan.categoriasNuevas.length, 'categoría nueva', 'categorías nuevas'));
	if (partes.length === 0) partes.push('orden actualizado');
	return `Listo: ${partes.join(', ')}.`;
}

/** Lee el archivo subido y lo compara con la carta de ese momento. Devuelve el plan o los motivos por los que no se puede usar. */
async function prepararPlan(formulario: FormData): Promise<{ plan: Plan } | { errores: string[] }> {
	const archivo = formulario.get('archivo');
	if (!(archivo instanceof File) || archivo.size === 0) return { errores: ['Elige el archivo Excel (.xlsx) de la planilla.'] };
	if (!archivo.name.toLowerCase().endsWith('.xlsx')) return { errores: ['El archivo debe ser un Excel (.xlsx). Si lo guardaste como .xls o .csv, vuelve a guardarlo como «Libro de Excel (.xlsx)».'] };
	if (archivo.size > TAMANO_MAXIMO_ARCHIVO) return { errores: ['El archivo es demasiado grande (máximo 1 MB). ¿Es la planilla de la carta?'] };

	const lectura = await leerPlanilla(new Uint8Array(await archivo.arrayBuffer()));
	if (!lectura.ok) return { errores: [lectura.error] };

	const plan = planificarCambios(lectura.filas, await listarCartaAdmin(obtenerBd()));
	if (plan.errores.length > 0) {
		const resto = plan.errores.length - ERRORES_MOSTRADOS;
		return { errores: [...plan.errores.slice(0, ERRORES_MOSTRADOS), ...(resto > 0 ? [`…y ${plural(resto, 'error más', 'errores más')}.`] : [])] };
	}
	return { plan };
}

export const planilla = {
	/** Paso 1: muestra qué cambiaría. No escribe nada. */
	revisarPlanilla: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaPlanilla> => {
			exigirSesion(contexto);
			const preparado = await prepararPlan(formulario);
			if ('errores' in preparado) return { ok: false, errores: preparado.errores };
			const mensaje = hayCambios(preparado.plan) ? 'Revisa el resumen y confirma para aplicar los cambios.' : 'La planilla no tiene cambios respecto de la carta actual.';
			return { ok: true, aplicado: false, resumen: resumirPlan(preparado.plan), mensaje };
		},
	}),

	/** Paso 2: vuelve a leer el archivo, lo compara con la carta de ese instante y aplica. */
	aplicarPlanilla: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaPlanilla> => {
			exigirSesion(contexto);
			const preparado = await prepararPlan(formulario);
			if ('errores' in preparado) return { ok: false, errores: preparado.errores };
			const { plan } = preparado;
			if (!hayCambios(plan)) return { ok: true, aplicado: false, resumen: resumirPlan(plan), mensaje: 'No había cambios para aplicar.' };

			await aplicarPlan(obtenerBd(), plan);
			const publicado = await publicar(contexto, mensajeDeAplicacion(plan));
			return { ok: true, aplicado: true, resumen: resumirPlan(plan), mensaje: publicado.ok ? publicado.mensaje : mensajeDeAplicacion(plan) };
		},
	}),
};
