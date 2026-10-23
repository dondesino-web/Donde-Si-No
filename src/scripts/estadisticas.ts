/*
 * Contadores de la carta, sin cookies ni identificadores: se avisa al servidor qué ocurrió («visita», «clic_mapa»…)
 * y él solo suma 1. Nada que identifique a la persona sale del navegador.
 */
const ENDPOINT = '/api/evento';

// Las pruebas automáticas (`navigator.webdriver`) no son visitas.
const enviar = (evento: string): void => {
	if (navigator.webdriver) return;
	navigator.sendBeacon?.(ENDPOINT, evento);
};

if (document.body.dataset.estadisticas === 'true') {
	enviar('visita');

	document.addEventListener('click', (clic) => {
		const elemento = (clic.target as Element | null)?.closest<HTMLElement>('[data-evento]');
		if (elemento?.dataset.evento) enviar(elemento.dataset.evento);
	});
}
