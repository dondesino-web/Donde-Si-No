/**
 * Carga con Excel: sube la planilla, muestra el resumen de lo que cambiaría y, solo cuando la persona confirma, lo aplica.
 * El archivo se queda en el navegador entre un paso y otro y se vuelve a enviar al confirmar: el servidor no guarda nada
 * entre los dos pasos y aplica contra la carta de ese momento.
 */
import { actions } from 'astro:actions';
import type { ResumenPlanilla } from '../actions/planilla.ts';

const MUESTRA_MAXIMA = 30;

const raiz = document.querySelector<HTMLElement>('[data-excel]');
const formulario = raiz?.querySelector<HTMLFormElement>('[data-excel-formulario]');
const resultado = raiz?.querySelector<HTMLElement>('[data-excel-resultado]');

function el<K extends keyof HTMLElementTagNameMap>(etiqueta: K, texto = '', clase = ''): HTMLElementTagNameMap[K] {
	const nodo = document.createElement(etiqueta);
	if (texto) nodo.textContent = texto;
	if (clase) nodo.className = clase;
	return nodo;
}

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

function lista(items: string[], maximo = MUESTRA_MAXIMA): HTMLUListElement {
	const ul = el('ul');
	for (const item of items.slice(0, maximo)) ul.append(el('li', item));
	if (items.length > maximo) ul.append(el('li', `…y ${items.length - maximo} más.`));
	return ul;
}

function mostrarErrores(errores: string[]): void {
	const caja = el('div', '', 'aviso aviso--error');
	caja.setAttribute('role', 'alert');
	caja.append(el('p', 'No se aplicó nada. Corrige esto en Excel y vuelve a subir la planilla:'), lista(errores, 50));
	resultado?.replaceChildren(caja);
}

function resumen(r: ResumenPlanilla): HTMLElement {
	const caja = el('div', '', 'resumen-excel');
	if (r.nuevos.length > 0) {
		caja.append(el('h3', plural(r.nuevos.length, 'producto nuevo', 'productos nuevos')), lista(r.nuevos.map((n) => `Fila ${n.fila}: ${n.nombre}`)));
	}
	if (r.categoriasNuevas.length > 0) {
		caja.append(el('h3', plural(r.categoriasNuevas.length, 'categoría nueva', 'categorías nuevas')), lista(r.categoriasNuevas));
	}
	if (r.modificados.length > 0) {
		caja.append(el('h3', plural(r.modificados.length, 'producto modificado', 'productos modificados')), lista(r.modificados.map((m) => `Fila ${m.fila}: ${m.nombre} (cambia ${m.campos.join(', ')})`)));
	}
	if (r.reordenadas > 0) caja.append(el('p', `Cambia el orden de los productos en ${plural(r.reordenadas, 'categoría', 'categorías')}.`));
	const otros = [`${plural(r.sinCambios, 'producto sin cambios', 'productos sin cambios')}.`];
	if (r.noIncluidos > 0) otros.push(`${plural(r.noIncluidos, 'producto de la carta no está', 'productos de la carta no están')} en la planilla y no se tocan (borrar una fila no borra el producto).`);
	caja.append(lista(otros));
	if (r.avisos.length > 0) {
		const avisos = el('div', '', 'aviso aviso--atencion');
		avisos.append(el('p', 'Ojo con estas filas (se omiten, el resto sí se aplica):'), lista(r.avisos));
		caja.append(avisos);
	}
	return caja;
}

if (raiz && formulario && resultado) {
	let datos: FormData | undefined;

	const ocupado = (mensaje: string): void => {
		resultado.replaceChildren(el('p', mensaje, 'carga-excel__estado'));
		for (const boton of raiz.querySelectorAll('button')) boton.disabled = true;
	};
	const libre = (): void => {
		for (const boton of raiz.querySelectorAll('button')) boton.disabled = false;
	};

	async function aplicar(): Promise<void> {
		if (!datos) return;
		ocupado('Aplicando los cambios…');
		const { data, error } = await actions.aplicarPlanilla(datos);
		libre();
		if (error || !data) return mostrarErrores([error?.message ?? 'No se pudo aplicar. Inténtalo de nuevo.']);
		if (!data.ok) return mostrarErrores(data.errores);

		const caja = el('div', '', 'aviso aviso--ok');
		caja.setAttribute('role', 'status');
		caja.append(el('p', data.mensaje));
		if (data.resumen.avisos.length > 0) caja.append(el('p', 'Estas filas se omitieron:'), lista(data.resumen.avisos));
		const enlaces = el('p');
		const ver = el('a', 'Ver la carta');
		ver.setAttribute('href', '/admin/carta');
		enlaces.append(ver);
		caja.append(enlaces);
		resultado!.replaceChildren(caja);
		datos = undefined;
		formulario!.reset();
	}

	formulario.addEventListener('submit', async (evento) => {
		evento.preventDefault();
		datos = new FormData(formulario);
		ocupado('Revisando la planilla…');
		const { data, error } = await actions.revisarPlanilla(datos);
		libre();
		if (error || !data) return mostrarErrores([error?.message ?? 'No se pudo revisar. Inténtalo de nuevo.']);
		if (!data.ok) return mostrarErrores(data.errores);

		const r = data.resumen;
		const hayCambios = r.nuevos.length + r.modificados.length + r.reordenadas > 0;
		const caja = el('div');
		caja.append(el('h3', 'Resumen de la planilla', 'carga-excel__titulo'), resumen(r));
		if (hayCambios) {
			caja.append(el('p', data.mensaje));
			const aplicarBoton = el('button', `Aplicar cambios`, 'boton');
			aplicarBoton.type = 'button';
			aplicarBoton.addEventListener('click', () => void aplicar());
			caja.append(aplicarBoton);
		} else {
			caja.append(el('p', data.mensaje, 'aviso aviso--ok'));
		}
		resultado.replaceChildren(caja);
	});
}
