/**
 * Lista de productos del panel: búsqueda, filtros (sin precio, agotados, ocultos), modo «Ordenar» y el botón
 * «Guardar precio» que solo aparece cuando el precio cambió. Sin JavaScript la lista completa sigue funcionando.
 */
import { coincideFiltro, type FiltroCarta } from '../lib/dominio/filtroCarta.ts';

const raiz = document.querySelector<HTMLElement>('[data-carta]');

if (raiz) {
	raiz.dataset.js = '';

	const buscador = raiz.querySelector<HTMLInputElement>('#buscar-producto');
	const botonesFiltro = [...raiz.querySelectorAll<HTMLButtonElement>('[data-filtro]')];
	const botonOrdenar = raiz.querySelector<HTMLButtonElement>('[data-ordenar]');
	const estado = raiz.querySelector<HTMLElement>('[data-estado-filtro]');
	const sinResultados = raiz.querySelector<HTMLElement>('[data-sin-resultados]');
	const categorias = [...raiz.querySelectorAll<HTMLDetailsElement>('[data-categoria]')];
	const productos = [...raiz.querySelectorAll<HTMLElement>('[data-producto]')];

	let filtro: FiltroCarta = 'todos';

	const aplicar = (): void => {
		const busqueda = buscador?.value ?? '';
		const activo = filtro !== 'todos' || busqueda.trim() !== '';
		let visibles = 0;

		for (const producto of productos) {
			const coincide = coincideFiltro(producto.dataset.texto ?? '', (producto.dataset.estados ?? '').split(' '), busqueda, filtro);
			producto.hidden = !coincide;
			if (coincide) visibles++;
		}
		for (const categoria of categorias) {
			const hay = categoria.querySelector('[data-producto]:not([hidden])') !== null;
			// Con una búsqueda o filtro activo solo se muestran las categorías con resultados, abiertas.
			categoria.hidden = activo && !hay;
			if (activo && hay) categoria.open = true;
		}
		if (sinResultados) sinResultados.hidden = visibles > 0;
		if (estado) estado.textContent = activo ? `Mostrando ${visibles} de ${productos.length} productos.` : '';
	};

	buscador?.addEventListener('input', aplicar);
	for (const boton of botonesFiltro) {
		boton.addEventListener('click', () => {
			filtro = boton.dataset.filtro as FiltroCarta;
			for (const otro of botonesFiltro) otro.setAttribute('aria-pressed', String(otro === boton));
			aplicar();
		});
	}

	botonOrdenar?.addEventListener('click', () => {
		const activo = botonOrdenar.getAttribute('aria-pressed') !== 'true';
		botonOrdenar.setAttribute('aria-pressed', String(activo));
		botonOrdenar.textContent = activo ? 'Terminar de ordenar' : 'Ordenar';
		raiz.toggleAttribute('data-ordenar', activo);
		if (activo) for (const categoria of categorias) categoria.open = true;
	});

	// «Guardar precio» aparece solo si el precio cambió; Escape deshace el cambio.
	for (const formulario of raiz.querySelectorAll<HTMLFormElement>('.fila-carta__precio')) {
		const campo = formulario.querySelector<HTMLInputElement>('input[name="precio"]');
		if (!campo) continue;
		const cambio = (): void => {
			formulario.toggleAttribute('data-sucio', campo.value.trim() !== (campo.dataset.original ?? ''));
		};
		campo.addEventListener('input', cambio);
		campo.addEventListener('keydown', (evento) => {
			if (evento.key !== 'Escape') return;
			campo.value = campo.dataset.original ?? '';
			cambio();
		});
	}
}
