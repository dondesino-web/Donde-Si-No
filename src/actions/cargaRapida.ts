import { defineAction } from 'astro:actions';
import { obtenerBd } from '../lib/db/index.ts';
import { crearCategoria, crearProductosEnLote } from '../lib/repositorios/adminCartaRepo.ts';
import { validarCategoria } from '../lib/validacion/carta.ts';
import { interpretarLineas } from '../lib/validacion/cargaRapida.ts';
import { cadena } from '../lib/validacion/comun.ts';
import { entero, exigirSesion, falla, noEncontrado, publicar, type RespuestaAccion } from './ayudas.ts';

/** Producto por producto, en plural cuando corresponde: lo lee el dueño. */
const productos = (n: number): string => (n === 1 ? '1 producto' : `${n} productos`);

export const cargaRapida = {
	cargarProductosRapido: defineAction({
		accept: 'form',
		handler: async (formulario, contexto): Promise<RespuestaAccion> => {
			exigirSesion(contexto);
			const bd = obtenerBd();

			const lineas = interpretarLineas(cadena(formulario, 'lineas'));
			if (!lineas.ok) return falla('lineas', lineas.errores.join('\n'));

			const nombreNuevo = cadena(formulario, 'categoriaNueva').trim();
			let categoriaId = entero(formulario, 'categoriaId');
			if (nombreNuevo !== '') {
				const datos = new FormData();
				datos.set('nombreEs', nombreNuevo);
				datos.set('visible', 'on');
				const categoria = validarCategoria(datos);
				if (!categoria.ok) return { ok: false, errores: { categoriaNueva: categoria.errores.nombreEs ?? 'La categoría no es válida.' } };
				categoriaId = (await crearCategoria(bd, categoria.datos)).id;
			}
			if (categoriaId === undefined) return falla('categoriaId', 'Elige una categoría o escribe el nombre de una nueva.');

			const resultado = await crearProductosEnLote(bd, categoriaId, lineas.productos);
			if (!resultado) return noEncontrado('La categoría');

			const omitidos = resultado.yaExistian.length > 0 ? ` Ya existían y no se tocaron: ${resultado.yaExistian.join(', ')}.` : '';
			const creados = resultado.creados === 0 ? 'No se creó ningún producto.' : `Se crearon ${productos(resultado.creados)}.`;
			return publicar(contexto, `${creados}${omitidos}`);
		},
	}),
};
