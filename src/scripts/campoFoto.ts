import { NavegadorNoSoportado, prepararFoto } from './prepararFoto.ts';

interface SubidaOk {
	sm: string;
	lg: string;
	ancho: number;
	alto: number;
}

/** Sube las dos versiones al servidor. Lanza con un mensaje que se puede mostrar tal cual. */
async function subir(chica: Blob, grande: Blob): Promise<SubidaOk> {
	const cuerpo = new FormData();
	cuerpo.append('sm', chica, 'sm.webp');
	cuerpo.append('lg', grande, 'lg.webp');

	let respuesta: Response;
	try {
		respuesta = await fetch('/api/admin/upload', { method: 'POST', body: cuerpo });
	} catch {
		throw new Error('No hay conexión. Revisa tu internet y vuelve a intentarlo.');
	}
	if (respuesta.status === 401) throw new Error('Tu sesión venció. Ingresa de nuevo y vuelve a subir la foto.');

	const datos = (await respuesta.json().catch(() => ({}))) as Partial<SubidaOk> & { error?: string };
	if (!respuesta.ok || !datos.sm || !datos.lg) throw new Error(datos.error ?? 'No se pudo subir la foto.');
	return datos as SubidaOk;
}

function iniciar(campo: HTMLElement): void {
	const archivo = campo.querySelector<HTMLInputElement>('[data-foto-archivo]');
	const oculto = campo.querySelector<HTMLInputElement>('[data-foto-valor]');
	const estado = campo.querySelector<HTMLElement>('[data-foto-estado]');
	const vista = campo.querySelector<HTMLImageElement>('[data-foto-vista]');
	const alt = campo.querySelector<HTMLInputElement>('[data-foto-alt]');
	const quitar = campo.querySelector<HTMLInputElement>('[data-foto-quitar]');
	const formulario = campo.closest('form');
	if (!archivo || !oculto || !estado || !formulario) return;

	const botones = formulario.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
	const ocupado = (valor: boolean): void => {
		campo.setAttribute('aria-busy', String(valor));
		for (const boton of botones) boton.disabled = valor;
	};
	const avisar = (texto: string, esError = false): void => {
		estado.textContent = texto;
		estado.setAttribute('role', esError ? 'alert' : 'status');
		estado.classList.toggle('aviso--error', esError);
	};

	const procesar = async (): Promise<void> => {
		const elegido = archivo.files?.[0];
		if (!elegido) return;

		ocupado(true);
		oculto.value = '';
		avisar('Preparando la foto…');
		try {
			const { chica, grande } = await prepararFoto(elegido);
			avisar('Subiendo la foto…');
			const subida = await subir(chica, grande);

			oculto.value = JSON.stringify(subida);
			if (vista) {
				vista.src = URL.createObjectURL(grande);
				vista.width = subida.ancho;
				vista.height = subida.alto;
				vista.hidden = false;
			}
			if (quitar) quitar.checked = false;
			// El texto de la foto se propone con el nombre del producto, pero la persona puede cambiarlo.
			const origen = campo.dataset.altOrigen ? document.querySelector<HTMLInputElement>(campo.dataset.altOrigen) : null;
			if (alt && alt.value.trim() === '' && origen) alt.value = origen.value.trim();
			avisar('Foto lista. Se publicará cuando guardes.');
		} catch (error) {
			archivo.value = '';
			const mensaje = error instanceof Error ? error.message : 'No se pudo preparar la foto.';
			avisar(error instanceof NavegadorNoSoportado ? mensaje : `No se pudo usar la foto. ${mensaje}`, true);
		} finally {
			ocupado(false);
		}
	};

	archivo.addEventListener('change', procesar);
	// Si la persona eligió la foto antes de que este script cargara (celular lento), no se pierde.
	void procesar();
	campo.dataset.listo = 'true';

	quitar?.addEventListener('change', () => {
		if (quitar.checked) {
			oculto.value = '';
			archivo.value = '';
			avisar('La foto se quitará cuando guardes.');
		}
	});
}

for (const campo of document.querySelectorAll<HTMLElement>('[data-campo-foto]')) iniciar(campo);
