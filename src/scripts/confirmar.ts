/**
 * Confirma las acciones destructivas (botones con `data-confirmar`) con un diálogo propio en vez del `confirm()` del navegador.
 * Sin JavaScript el formulario se envía igual: la confirmación es una ayuda, no un requisito.
 */

// Sin import/export, TypeScript lo trata como script global y sus nombres chocarían con los de otros scripts.
export {};

const dialogo = document.querySelector<HTMLDialogElement>('#dialogo-confirmar');
const mensaje = document.querySelector<HTMLElement>('#dialogo-mensaje');

if (dialogo && mensaje && typeof dialogo.showModal === 'function') {
	// Formularios que el dueño ya confirmó: su reenvío no vuelve a preguntar.
	const confirmados = new WeakSet<HTMLFormElement>();

	document.addEventListener('submit', (evento) => {
		const formulario = evento.target as HTMLFormElement;
		if (formulario.method === 'dialog' || confirmados.has(formulario)) return;

		const boton = (evento as SubmitEvent).submitter as HTMLButtonElement | null;
		const pregunta = boton?.dataset.confirmar;
		if (!boton || !pregunta) return;

		evento.preventDefault();
		mensaje.textContent = pregunta;
		dialogo.returnValue = '';
		dialogo.addEventListener(
			'close',
			() => {
				if (dialogo.returnValue !== 'confirmar') return;
				confirmados.add(formulario);
				// `requestSubmit` con el botón original conserva su nombre y valor en el envío.
				formulario.requestSubmit(boton);
			},
			{ once: true },
		);
		dialogo.showModal();
	});
}

// Las pruebas esperan esta marca para no pulsar «Eliminar» antes de que el diálogo esté listo.
document.documentElement.dataset.confirmarListo = '';
