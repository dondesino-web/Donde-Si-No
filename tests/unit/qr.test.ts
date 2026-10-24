import { describe, expect, it } from 'vitest';
import { matrizDelQr, svgDelQr, urlDelQr } from '../../src/lib/qr.ts';

describe('urlDelQr', () => {
	it('apunta siempre a /qr del sitio: el QR impreso no cambia aunque cambie el destino', () => {
		expect(urlDelQr(new URL('https://www.donde-sino.com/'))).toBe('https://www.donde-sino.com/qr');
		expect(urlDelQr(new URL('https://www.donde-sino.com/en/print?x=1#y'))).toBe('https://www.donde-sino.com/qr');
	});

	it('exige https (un QR impreso con http no se puede corregir después)', () => {
		expect(() => urlDelQr(new URL('http://localhost:4321/'))).toThrow(/https/);
	});
});

describe('svgDelQr', () => {
	const URL_QR = 'https://www.donde-sino.com/qr';

	it('genera un SVG con fondo blanco y módulos negros, sin scripts', () => {
		const svg = svgDelQr(URL_QR);

		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('viewBox=');
		expect(svg).toContain('fill="white"');
		expect(svg).toContain('fill="black"');
		expect(svg.toLowerCase()).not.toContain('<script');
	});

	it('es determinista y depende de la dirección', () => {
		expect(svgDelQr(URL_QR)).toBe(svgDelQr(URL_QR));
		expect(svgDelQr(URL_QR)).not.toBe(svgDelQr('https://www.donde-sino.com/otro'));
	});

	it('deja una zona de silencio alrededor (el borde que exigen los lectores de QR)', () => {
		const sinBorde = matrizDelQr(URL_QR).length;
		const [, , ancho] = /viewBox="0 0 (\d+) (\d+)"/.exec(svgDelQr(URL_QR)) ?? [];

		expect(Number(ancho)).toBeGreaterThan(sinBorde * 10);
	});
});

describe('matrizDelQr', () => {
	it('es cuadrada y tiene los patrones de posición en tres esquinas', () => {
		const matriz = matrizDelQr('https://www.donde-sino.com/qr');
		const n = matriz.length;

		expect(matriz.every((fila) => fila.length === n)).toBe(true);
		// Cada patrón de posición tiene un cuadrado oscuro de 7×7 en su borde.
		for (const [fila, columna] of [
			[0, 0],
			[0, n - 7],
			[n - 7, 0],
		]) {
			expect([0, 1, 2, 3, 4, 5, 6].every((i) => matriz[fila][columna + i] && matriz[fila + 6][columna + i])).toBe(true);
		}
	});
});
