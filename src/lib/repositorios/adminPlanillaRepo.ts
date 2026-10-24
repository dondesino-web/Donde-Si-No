import { eq } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { producto } from '../db/esquema.ts';
import { ordenFinal, type DestinoCategoria, type Plan } from '../excel/plan.ts';
import { crearCategoria } from './adminCartaRepo.ts';

export interface ResultadoAplicacion {
	categoriasCreadas: number;
	creados: number;
	modificados: number;
}

/**
 * Escribe en la base el plan que salió de la planilla, todo en una sola transacción: o se aplica completo o no se aplica.
 * Nunca borra productos. Los cambios de orden no renuevan la fecha de modificación (no cuentan como edición).
 */
export async function aplicarPlan(bd: Bd, plan: Plan): Promise<ResultadoAplicacion> {
	return bd.transaction(async (tx) => {
		const idsNuevos = new Map<string, number>();
		for (const nueva of plan.categoriasNuevas) {
			const creada = await crearCategoria(tx, { nombreEs: nueva.nombreEs, nombreEn: null, visible: true });
			idsNuevos.set(nueva.clave, creada.id);
		}
		const idDe = (destino: DestinoCategoria): number => (destino.tipo === 'existente' ? destino.id : idsNuevos.get(destino.clave)!);

		const idsDeNuevos: number[] = [];
		for (const nuevo of plan.nuevos) {
			// El orden definitivo se fija al final; aquí solo hace falta un valor.
			const [creado] = await tx.insert(producto).values({ ...nuevo.datos, categoriaId: idDe(nuevo.categoria), orden: 0 }).returning({ id: producto.id });
			idsDeNuevos.push(creado!.id);
		}

		const ahora = new Date();
		for (const cambio of plan.modificados) {
			await tx.update(producto).set({ ...cambio.cambios, categoriaId: idDe(cambio.categoria), actualizadoEn: ahora }).where(eq(producto.id, cambio.id));
		}

		for (const grupo of plan.ordenCategorias) {
			const categoriaId = idDe(grupo.categoria);
			const enPlanilla = grupo.entradas.map((e) => ('id' in e ? e.id : idsDeNuevos[e.nuevo]!));
			const actuales = await tx.select({ id: producto.id, orden: producto.orden }).from(producto).where(eq(producto.categoriaId, categoriaId));
			const ordenAnterior = new Map(actuales.map((p) => [p.id, p.orden]));
			for (const [orden, id] of ordenFinal(enPlanilla, actuales).entries()) {
				if (ordenAnterior.get(id) !== orden) await tx.update(producto).set({ orden }).where(eq(producto.id, id));
			}
		}

		return { categoriasCreadas: plan.categoriasNuevas.length, creados: plan.nuevos.length, modificados: plan.modificados.length };
	});
}
