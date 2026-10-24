/**
 * Convierte el panel en una app instalable (PWA): registra el service worker y maneja el botón «Instalar app».
 * Android/Chrome ofrece instalar con el evento `beforeinstallprompt`; iPhone no lo tiene y se explica con pasos.
 */

// Sin import/export, TypeScript lo trata como script global y sus nombres chocarían con los de otros scripts.
export {};

interface EventoInstalacion extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const YA_INSTALADA = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

if ('serviceWorker' in navigator) {
	// El archivo está en la raíz (no en /admin, que exige sesión) y el alcance se acota a /admin (incluye /admin y todo lo que cuelga de él): la carta pública no se toca.
	navigator.serviceWorker.register('/panel-sw.js', { scope: '/admin' }).catch(() => {
		/* Sin service worker el panel funciona igual: solo falta el aviso de «sin conexión». */
	});
}

const seccion = document.getElementById('instalar-app');
const boton = document.getElementById('instalar-boton') as HTMLButtonElement | null;
const pasosIphone = document.getElementById('instalar-iphone');
const estado = document.getElementById('instalar-estado');

if (seccion && boton) {
	const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
	let eventoPendiente: EventoInstalacion | undefined;

	const avisar = (texto: string): void => {
		if (estado) estado.textContent = texto;
	};

	if (YA_INSTALADA) {
		seccion.hidden = true;
	} else if (esIphone && pasosIphone) {
		seccion.hidden = false;
		pasosIphone.hidden = false;
	}

	window.addEventListener('beforeinstallprompt', (evento) => {
		evento.preventDefault();
		eventoPendiente = evento as EventoInstalacion;
		if (!YA_INSTALADA) {
			seccion.hidden = false;
			boton.hidden = false;
		}
	});

	boton.addEventListener('click', async () => {
		if (!eventoPendiente) return;
		await eventoPendiente.prompt();
		const { outcome } = await eventoPendiente.userChoice;
		eventoPendiente = undefined;
		boton.hidden = true;
		avisar(outcome === 'accepted' ? 'Listo: busca «Panel» entre las apps de tu teléfono.' : 'No se instaló. Puedes intentarlo cuando quieras.');
	});

	window.addEventListener('appinstalled', () => {
		boton.hidden = true;
		avisar('Listo: busca «Panel» entre las apps de tu teléfono.');
	});
}
