import type { CategoriaConProductos, Producto } from '../repositorios/cartaRepo.ts';
import { claveDeNombre } from '../validacion/cargaRapida.ts';
import { PRECIO_MAXIMO, parsearPrecio } from '../validacion/comun.ts';
import type { ClaveColumna } from './columnas.ts';

/**
 * Decide qué hay que cambiar en la base a partir de las filas de la planilla. Es lógica pura: no toca la base ni el archivo.
 *
 * Reglas:
 * - Una fila con ID modifica ese producto; una fila sin ID crea uno nuevo. Nunca se borra nada.
 * - Si hay un solo error en cualquier fila, no se propone ningún cambio (todo o nada).
 * - Un producto que cambió en el panel después de descargar la planilla, y cuya fila trae cambios, se omite (conflicto).
 * - Las columnas que no están en la planilla no se tocan. Un precio vacío es «Consultar».
 */

export const FILAS_MAXIMAS = 1000;
const LARGO_CATEGORIA = 60;
const LARGO_NOMBRE = 80;
const LARGO_DESCRIPCION = 300;

export type Celda = string | number | boolean | Date | null | undefined;
export interface FilaCruda {
	/** Número de fila en la hoja (para avisar al dueño). */
	fila: number;
	/** Solo las columnas presentes en la planilla. */
	celdas: Partial<Record<ClaveColumna, Celda>>;
}

export type DestinoCategoria = { tipo: 'existente'; id: number } | { tipo: 'nueva'; clave: string };

export interface DatosProductoPlanilla {
	nombreEs: string;
	descripcionEs: string;
	precio: number | null;
	disponible: boolean;
	visible: boolean;
	destacado: boolean;
	nombreEn: string | null;
	descripcionEn: string | null;
}

export interface ProductoNuevoPlan {
	fila: number;
	categoria: DestinoCategoria;
	datos: DatosProductoPlanilla;
}

export interface ProductoModificadoPlan {
	fila: number;
	id: number;
	/** Nombre resultante, para mostrarlo al dueño. */
	nombre: string;
	categoria: DestinoCategoria;
	/** Nombres de las columnas que cambian, en el orden de la planilla. */
	campos: string[];
	cambios: Partial<DatosProductoPlanilla>;
}

export type EntradaOrden = { id: number } | { nuevo: number };

export interface Plan {
	errores: string[];
	avisos: string[];
	categoriasNuevas: { clave: string; nombreEs: string }[];
	nuevos: ProductoNuevoPlan[];
	modificados: ProductoModificadoPlan[];
	conflictos: { fila: number; nombre: string }[];
	sinCambios: number;
	/** Productos de la base que no aparecen en la planilla: no se tocan. */
	noIncluidos: number;
	ordenCategorias: { categoria: DestinoCategoria; entradas: EntradaOrden[] }[];
	/** Categorías cuyo orden de productos cambia (solo por el orden de las filas, o por productos nuevos). */
	reordenadas: number;
}

const planVacio = (): Plan => ({ errores: [], avisos: [], categoriasNuevas: [], nuevos: [], modificados: [], conflictos: [], sinCambios: 0, noIncluidos: 0, ordenCategorias: [], reordenadas: 0 });

const TEXTO_VACIO = (valor: Celda): boolean => valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');
const aTexto = (valor: Celda): string => (TEXTO_VACIO(valor) ? '' : valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).trim());

const SI = new Set(['si', 's', 'x', '1', 'true', 'verdadero', 'yes', 'y']);
const NO = new Set(['no', 'n', '0', 'false', 'falso']);

/** `undefined` = vacío; `null` = valor que no se entiende. */
function leerSiNo(valor: Celda): boolean | undefined | null {
	if (TEXTO_VACIO(valor)) return undefined;
	if (typeof valor === 'boolean') return valor;
	const clave = claveDeNombre(String(valor));
	if (SI.has(clave)) return true;
	if (NO.has(clave)) return false;
	return null;
}

/** `undefined` = precio no válido. */
function leerPrecio(valor: Celda): number | null | undefined {
	if (TEXTO_VACIO(valor)) return null;
	if (typeof valor === 'number') return Number.isInteger(valor) && valor >= 0 && valor <= PRECIO_MAXIMO ? valor : undefined;
	if (typeof valor === 'string') return parsearPrecio(valor);
	return undefined;
}

function leerId(valor: Celda): number | undefined | null {
	if (TEXTO_VACIO(valor)) return undefined;
	const numero = typeof valor === 'number' ? valor : /^\d{1,9}$/.test(String(valor).trim()) ? Number(String(valor).trim()) : NaN;
	return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function leerVersion(valor: Celda): number | undefined {
	const numero = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim());
	return TEXTO_VACIO(valor) || !Number.isFinite(numero) ? undefined : numero;
}

interface FilaLeida {
	fila: number;
	id?: number;
	version?: number;
	categoria?: string;
	datos: Partial<DatosProductoPlanilla>;
	tieneNombre: boolean;
}

/** Valida una fila y la convierte. Devuelve los errores en el orden en que se leen las columnas. */
function leerFila(cruda: FilaCruda, errores: string[]): FilaLeida | undefined {
	const { fila, celdas } = cruda;
	const antes = errores.length;
	const falla = (mensaje: string): void => void errores.push(`Fila ${fila}: ${mensaje}`);
	const tiene = (clave: ClaveColumna): boolean => Object.hasOwn(celdas, clave);

	const id = leerId(celdas.id);
	if (id === null) falla(`el ID «${aTexto(celdas.id)}» no es válido. No lo cambies: déjalo como estaba o bórralo para crear un producto nuevo.`);
	const esNuevo = id === undefined;

	const categoria = aTexto(celdas.categoria);
	if (categoria === '' && esNuevo) falla('falta la categoría.');
	else if (categoria.length > LARGO_CATEGORIA) falla(`la categoría no puede pasar de ${LARGO_CATEGORIA} caracteres.`);

	const datos: Partial<DatosProductoPlanilla> = {};
	const nombre = aTexto(celdas.producto);
	if (tiene('producto') || esNuevo) {
		if (nombre === '') falla('falta el nombre del producto.');
		else if (nombre.length > LARGO_NOMBRE) falla(`el nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`);
		else datos.nombreEs = nombre;
	}
	if (tiene('descripcion')) {
		const descripcion = aTexto(celdas.descripcion);
		if (descripcion.length > LARGO_DESCRIPCION) falla(`la descripción no puede pasar de ${LARGO_DESCRIPCION} caracteres.`);
		else datos.descripcionEs = descripcion;
	}
	if (tiene('precio')) {
		const precio = leerPrecio(celdas.precio);
		if (precio === undefined) falla(`el precio «${aTexto(celdas.precio)}» no es válido (usa solo números, por ejemplo 4500).`);
		else datos.precio = precio;
	}
	for (const [clave, etiqueta, campo] of [['disponible', 'Disponible', 'disponible'], ['visible', 'Visible', 'visible'], ['destacado', 'Destacado', 'destacado']] as const) {
		if (!tiene(clave)) continue;
		const valor = leerSiNo(celdas[clave]);
		if (valor === null) falla(`«${aTexto(celdas[clave])}» no vale en ${etiqueta} (escribe Sí o No).`);
		else if (valor !== undefined) datos[campo] = valor;
	}
	if (tiene('nombreEn')) {
		const texto = aTexto(celdas.nombreEn);
		if (texto.length > LARGO_NOMBRE) falla(`el nombre en inglés no puede pasar de ${LARGO_NOMBRE} caracteres.`);
		else datos.nombreEn = texto === '' ? null : texto;
	}
	if (tiene('descripcionEn')) {
		const texto = aTexto(celdas.descripcionEn);
		if (texto.length > LARGO_DESCRIPCION) falla(`la descripción en inglés no puede pasar de ${LARGO_DESCRIPCION} caracteres.`);
		else datos.descripcionEn = texto === '' ? null : texto;
	}

	if (errores.length > antes) return undefined;
	return { fila, id: id ?? undefined, version: leerVersion(celdas.version), categoria: categoria || undefined, datos, tieneNombre: nombre !== '' };
}

/**
 * Orden en que quedan los productos de una categoría: primero los de la planilla, en el orden de sus filas, y después los que
 * no aparecen en ella, en el orden que ya tenían. Lo comparten el plan (para saber si cambia) y la base (para escribirlo).
 */
export function ordenFinal(idsDeLaPlanilla: readonly number[], actuales: readonly { id: number; orden: number }[]): number[] {
	const deAqui = new Set(actuales.map((p) => p.id));
	const primeros = [...new Set(idsDeLaPlanilla)].filter((id) => deAqui.has(id));
	const resto = actuales.filter((p) => !primeros.includes(p.id)).sort((a, b) => a.orden - b.orden || a.id - b.id).map((p) => p.id);
	return [...primeros, ...resto];
}

const filaVacia = (celdas: FilaCruda['celdas']): boolean => Object.values(celdas).every(TEXTO_VACIO);

const ETIQUETAS_CAMPOS: [keyof DatosProductoPlanilla, string][] = [
	['nombreEs', 'Producto'],
	['descripcionEs', 'Descripción'],
	['precio', 'Precio'],
	['disponible', 'Disponible'],
	['visible', 'Visible'],
	['destacado', 'Destacado'],
	['nombreEn', 'Nombre en inglés'],
	['descripcionEn', 'Descripción en inglés'],
];

const claveDestino = (destino: DestinoCategoria): string => (destino.tipo === 'existente' ? `e${destino.id}` : `n${destino.clave}`);

export function planificarCambios(filas: readonly FilaCruda[], carta: readonly CategoriaConProductos[]): Plan {
	const plan = planVacio();
	const conDatos = filas.filter((f) => !filaVacia(f.celdas));
	if (conDatos.length > FILAS_MAXIMAS) {
		plan.errores.push(`La planilla tiene demasiadas filas: carga hasta ${FILAS_MAXIMAS} productos por vez.`);
		return plan;
	}

	// 1. Leer y validar cada fila.
	const leidas: FilaLeida[] = [];
	for (const cruda of conDatos) {
		const leida = leerFila(cruda, plan.errores);
		if (leida) leidas.push(leida);
	}
	const idsVistos = new Map<number, number>();
	for (const leida of leidas) {
		if (leida.id === undefined) continue;
		const antes = idsVistos.get(leida.id);
		if (antes !== undefined) plan.errores.push(`Fila ${leida.fila}: el ID ${leida.id} está repetido (ya está en la fila ${antes}).`);
		else idsVistos.set(leida.id, leida.fila);
	}
	if (plan.errores.length > 0) return plan;

	// 2. Categorías: las existentes se reconocen por nombre; las que no existen se crearán.
	const categoriaPorClave = new Map(carta.map((c) => [claveDeNombre(c.nombreEs), c]));
	const nombreDeCategoria = new Map<string, string>(carta.map((c) => [claveDestino({ tipo: 'existente', id: c.id }), c.nombreEs]));
	const destinoDe = (nombre: string): DestinoCategoria => {
		const clave = claveDeNombre(nombre);
		const existente = categoriaPorClave.get(clave);
		if (existente) return { tipo: 'existente', id: existente.id };
		if (!plan.categoriasNuevas.some((c) => c.clave === clave)) {
			plan.categoriasNuevas.push({ clave, nombreEs: nombre });
			nombreDeCategoria.set(claveDestino({ tipo: 'nueva', clave }), nombre);
		}
		return { tipo: 'nueva', clave };
	};

	const productos = new Map<number, Producto>(carta.flatMap((c) => c.productos).map((p) => [p.id, p]));

	// 3. Clasificar cada fila: producto que se modifica, sin cambios, conflicto, o nuevo.
	interface Trabajo {
		leida: FilaLeida;
		producto?: Producto;
		destino: DestinoCategoria;
		datos: Partial<DatosProductoPlanilla>;
		campos: string[];
		cambios: Partial<DatosProductoPlanilla>;
	}
	const trabajos: Trabajo[] = [];
	const filasDeProductos = new Set<number>();
	for (const leida of leidas) {
		if (leida.id === undefined) {
			trabajos.push({ leida, destino: destinoDe(leida.categoria!), datos: leida.datos, campos: [], cambios: {} });
			continue;
		}
		const producto = productos.get(leida.id);
		if (!producto) {
			plan.avisos.push(`Fila ${leida.fila}: el producto con ID ${leida.id} ya no existe (se borró después de descargar la planilla). Se omite.`);
			continue;
		}
		filasDeProductos.add(producto.id);
		const destino: DestinoCategoria = leida.categoria ? destinoDe(leida.categoria) : { tipo: 'existente', id: producto.categoriaId };
		const campos: string[] = [];
		const cambios: Partial<DatosProductoPlanilla> = {};
		if (!(destino.tipo === 'existente' && destino.id === producto.categoriaId)) campos.push('Categoría');
		for (const [campo, etiqueta] of ETIQUETAS_CAMPOS) {
			if (!(campo in leida.datos) || leida.datos[campo] === producto[campo]) continue;
			(cambios as Record<string, unknown>)[campo] = leida.datos[campo];
			campos.push(etiqueta);
		}
		const hayCambios = campos.length > 0;
		const modificadoDespues = leida.version !== undefined && Math.floor(producto.actualizadoEn.getTime() / 1000) > leida.version;
		if (hayCambios && modificadoDespues) {
			plan.conflictos.push({ fila: leida.fila, nombre: producto.nombreEs });
			plan.avisos.push(`Fila ${leida.fila}: «${producto.nombreEs}» cambió en el panel después de descargar la planilla; se omite para no pisar ese cambio. Descarga la planilla de nuevo.`);
			continue;
		}
		trabajos.push({ leida, producto, destino, datos: leida.datos, campos, cambios });
	}

	// 4. Nombres únicos por categoría, mirando cómo quedaría la carta: los productos que no están en la planilla
	//    conservan su nombre; los de la planilla toman el que traen (así se pueden intercambiar nombres).
	interface Dueno { fila?: number }
	const duenos = new Map<string, Dueno>();
	const enTrabajo = new Set(trabajos.flatMap((t) => (t.producto ? [t.producto.id] : [])));
	for (const categoria of carta) {
		for (const p of categoria.productos) {
			if (!enTrabajo.has(p.id)) duenos.set(`e${categoria.id}|${claveDeNombre(p.nombreEs)}`, {});
		}
	}
	const aceptados: Trabajo[] = [];
	for (const trabajo of trabajos) {
		const nombre = trabajo.datos.nombreEs ?? trabajo.producto!.nombreEs;
		const clave = `${claveDestino(trabajo.destino)}|${claveDeNombre(nombre)}`;
		const nombreCategoria = nombreDeCategoria.get(claveDestino(trabajo.destino)) ?? '';
		const dueno = duenos.get(clave);
		if (dueno?.fila !== undefined) {
			plan.errores.push(`Fila ${trabajo.leida.fila}: «${nombre}» está repetido en ${nombreCategoria} (ya está en la fila ${dueno.fila}).`);
			continue;
		}
		if (dueno) {
			if (trabajo.producto) {
				plan.errores.push(`Fila ${trabajo.leida.fila}: «${nombre}» ya existe en ${nombreCategoria}.`);
			} else {
				plan.avisos.push(`Fila ${trabajo.leida.fila}: «${nombre}» ya existe en ${nombreCategoria}; no se duplica ni se cambia. Para modificarlo, usa su fila de la planilla descargada.`);
			}
			continue;
		}
		duenos.set(clave, { fila: trabajo.leida.fila });
		aceptados.push(trabajo);
	}
	if (plan.errores.length > 0) return { ...planVacio(), errores: plan.errores, avisos: plan.avisos };

	// 5. Resultado.
	const ordenes = new Map<string, { categoria: DestinoCategoria; entradas: EntradaOrden[] }>();
	const agregarOrden = (destino: DestinoCategoria, entrada: EntradaOrden): void => {
		const clave = claveDestino(destino);
		const grupo = ordenes.get(clave) ?? { categoria: destino, entradas: [] };
		grupo.entradas.push(entrada);
		ordenes.set(clave, grupo);
	};
	for (const trabajo of aceptados) {
		if (!trabajo.producto) {
			const d = trabajo.datos;
			plan.nuevos.push({
				fila: trabajo.leida.fila,
				categoria: trabajo.destino,
				datos: {
					nombreEs: d.nombreEs!,
					descripcionEs: d.descripcionEs ?? '',
					precio: d.precio ?? null,
					disponible: d.disponible ?? true,
					visible: d.visible ?? true,
					destacado: d.destacado ?? false,
					nombreEn: d.nombreEn ?? null,
					descripcionEn: d.descripcionEn ?? null,
				},
			});
			agregarOrden(trabajo.destino, { nuevo: plan.nuevos.length - 1 });
			continue;
		}
		if (trabajo.campos.length === 0) plan.sinCambios++;
		else {
			plan.modificados.push({ fila: trabajo.leida.fila, id: trabajo.producto.id, nombre: trabajo.cambios.nombreEs ?? trabajo.producto.nombreEs, categoria: trabajo.destino, campos: trabajo.campos, cambios: trabajo.cambios });
		}
		agregarOrden(trabajo.destino, { id: trabajo.producto.id });
	}
	plan.noIncluidos = productos.size - filasDeProductos.size;
	plan.ordenCategorias = [...ordenes.values()];

	// ¿Cambia el orden? Se compara el orden actual de los productos que quedarán en cada categoría con el que dejaría la planilla.
	const categoriaFinal = new Map<number, string>([...productos.values()].map((p) => [p.id, claveDestino({ tipo: 'existente', id: p.categoriaId })]));
	for (const trabajo of aceptados) if (trabajo.producto) categoriaFinal.set(trabajo.producto.id, claveDestino(trabajo.destino));
	for (const grupo of plan.ordenCategorias) {
		const clave = claveDestino(grupo.categoria);
		const actuales = [...productos.values()].filter((p) => categoriaFinal.get(p.id) === clave).map((p) => ({ id: p.id, orden: p.orden }));
		const deLaPlanilla = grupo.entradas.flatMap((e) => ('id' in e ? [e.id] : []));
		const hayNuevos = grupo.entradas.some((e) => 'nuevo' in e);
		const antes = [...actuales].sort((a, b) => a.orden - b.orden || a.id - b.id).map((p) => p.id);
		if (hayNuevos || ordenFinal(deLaPlanilla, actuales).some((id, i) => id !== antes[i])) plan.reordenadas++;
	}
	return plan;
}
