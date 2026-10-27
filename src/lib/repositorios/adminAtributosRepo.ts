import { and, asc, eq, like, max } from 'drizzle-orm';
import type { Bd } from '../db/cliente.ts';
import { atributo, producto } from '../db/esquema.ts';
import { slugificar } from '../dominio/slug.ts';
import type { TipoAtributo } from '../dominio/tipos.ts';

export type Atributo = typeof atributo.$inferSelect;

export interface DatosAtributo {
	tipo: TipoAtributo;
	nombreEs: string;
	nombreEn: string | null;
}

export type ResultadoGuardarAtributo = { ok: true; atributo: Atributo } | { ok: false; motivo: 'repetido' | 'no-existe' };
export type ResultadoEliminarAtributo = { ok: true; productos: number } | { ok: false; motivo: 'no-existe' };

/** Nombre sin tildes, mayúsculas ni espacios de más: «MANÍ» y «maní» son el mismo. */
const huellaDeNombre = (nombre: string): string => slugificar(nombre);

/** La clave es lo que guardan los productos: estable aunque después se renombre el atributo. */
const claveDeNombre = (nombre: string): string => huellaDeNombre(nombre).replaceAll('-', '_');

/** Catálogo completo, en el orden en que la persona lo dejó (primero alérgenos y etiquetas por separado en cada lista). */
export function listarAtributos(bd: Bd): Promise<Atributo[]> {
	return bd.select().from(atributo).orderBy(asc(atributo.orden), asc(atributo.id));
}

const delTipo = (atributos: readonly Atributo[], tipo: TipoAtributo): Atributo[] => atributos.filter((a) => a.tipo === tipo);

export async function crearAtributo(bd: Bd, datos: DatosAtributo): Promise<ResultadoGuardarAtributo> {
	return bd.transaction(async (tx) => {
		const existentes = delTipo(await tx.select().from(atributo), datos.tipo);
		const huella = huellaDeNombre(datos.nombreEs);
		if (existentes.some((a) => huellaDeNombre(a.nombreEs) === huella)) return { ok: false, motivo: 'repetido' } as const;

		// Si la clave ya la usa otro (por ejemplo, uno renombrado), se le agrega un número: nunca se pisa.
		const claves = new Set(existentes.map((a) => a.clave));
		const base = claveDeNombre(datos.nombreEs);
		let clave = base;
		for (let n = 2; claves.has(clave); n++) clave = `${base}_${n}`;

		const [{ ultimo }] = await tx.select({ ultimo: max(atributo.orden) }).from(atributo).where(eq(atributo.tipo, datos.tipo));
		const [creado] = await tx
			.insert(atributo)
			.values({ tipo: datos.tipo, clave, nombreEs: datos.nombreEs, nombreEn: datos.nombreEn, orden: ultimo === null ? 0 : ultimo + 1 })
			.returning();
		return { ok: true, atributo: creado } as const;
	});
}

/** Cambia los nombres, nunca la clave: los productos que lo llevan siguen enlazados. */
export async function actualizarAtributo(bd: Bd, id: number, datos: Pick<DatosAtributo, 'nombreEs' | 'nombreEn'>): Promise<ResultadoGuardarAtributo> {
	return bd.transaction(async (tx) => {
		const actual = await tx.select().from(atributo).where(eq(atributo.id, id)).get();
		if (!actual) return { ok: false, motivo: 'no-existe' } as const;

		const huella = huellaDeNombre(datos.nombreEs);
		const otros = delTipo(await tx.select().from(atributo), actual.tipo).filter((a) => a.id !== id);
		if (otros.some((a) => huellaDeNombre(a.nombreEs) === huella)) return { ok: false, motivo: 'repetido' } as const;

		const [guardado] = await tx.update(atributo).set({ nombreEs: datos.nombreEs, nombreEn: datos.nombreEn }).where(eq(atributo.id, id)).returning();
		return { ok: true, atributo: guardado } as const;
	});
}

/** Lo quita del catálogo y de todos los productos que lo llevaban, en una sola transacción. */
export async function eliminarAtributo(bd: Bd, id: number): Promise<ResultadoEliminarAtributo> {
	return bd.transaction(async (tx) => {
		const actual = await tx.select().from(atributo).where(eq(atributo.id, id)).get();
		if (!actual) return { ok: false, motivo: 'no-existe' } as const;

		await tx.delete(atributo).where(and(eq(atributo.id, id)));

		const columna = actual.tipo === 'alergeno' ? 'alergenos' : 'etiquetas';
		// El LIKE solo acota candidatos; la comprobación exacta se hace sobre la lista ya leída.
		const candidatos = await tx.select().from(producto).where(like(producto[columna], `%"${actual.clave}"%`));
		let afectados = 0;
		for (const p of candidatos) {
			const lista = p[columna];
			if (!lista.includes(actual.clave)) continue;
			await tx
				.update(producto)
				.set({ [columna]: lista.filter((clave) => clave !== actual.clave), actualizadoEn: new Date() })
				.where(eq(producto.id, p.id));
			afectados++;
		}
		return { ok: true, productos: afectados } as const;
	});
}
