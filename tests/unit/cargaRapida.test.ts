import { describe, expect, it } from 'vitest';
import { LINEAS_MAXIMAS, interpretarLineas } from '../../src/lib/validacion/cargaRapida.ts';

describe('interpretarLineas', () => {
	it('lee nombre, precio y descripción separados por punto y coma', () => {
		const resultado = interpretarLineas('Costillar; 8000; Con puré o arroz');

		expect(resultado).toEqual({ ok: true, productos: [{ nombreEs: 'Costillar', precio: 8000, descripcionEs: 'Con puré o arroz' }] });
	});

	it('acepta precios con punto de miles y el signo $', () => {
		const resultado = interpretarLineas('Combo; $ 21.990\nCafé;1.000');

		expect(resultado.ok && resultado.productos.map((p) => p.precio)).toEqual([21990, 1000]);
	});

	it('deja «Consultar» (null) cuando no hay precio, sea con la columna vacía o sin la columna', () => {
		const resultado = interpretarLineas('Lasagna;\nBistec\nPescado frito; ; Del día');

		expect(resultado.ok && resultado.productos.map((p) => p.precio)).toEqual([null, null, null]);
		expect(resultado.ok && resultado.productos[2]?.descripcionEs).toBe('Del día');
	});

	it('entiende las columnas pegadas desde una planilla (separadas por tabulador)', () => {
		const resultado = interpretarLineas('Té\t1000\tCaliente\nCafé\t1000');

		expect(resultado).toEqual({
			ok: true,
			productos: [
				{ nombreEs: 'Té', precio: 1000, descripcionEs: 'Caliente' },
				{ nombreEs: 'Café', precio: 1000, descripcionEs: '' },
			],
		});
	});

	it('conserva los punto y coma dentro de la descripción', () => {
		const resultado = interpretarLineas('Plato; 5000; Arroz; puré o papas');

		expect(resultado.ok && resultado.productos[0]?.descripcionEs).toBe('Arroz; puré o papas');
	});

	it('ignora líneas vacías y espacios sobrantes, y acepta saltos de línea de Windows', () => {
		const resultado = interpretarLineas('\r\n  Té ; 1000  \r\n\r\n   \r\nCafé;1000\r\n');

		expect(resultado.ok && resultado.productos.map((p) => p.nombreEs)).toEqual(['Té', 'Café']);
	});

	it('si no hay ninguna línea, pide escribir al menos un producto', () => {
		expect(interpretarLineas('  \n \n')).toEqual({ ok: false, errores: ['Escribe al menos un producto, uno por línea.'] });
	});

	it('señala la línea de cada problema y no acepta nada si hay alguno', () => {
		const resultado = interpretarLineas('Té; 1000\n; 500\nCafé; mil\n' + 'X'.repeat(81) + '; 100');

		expect(resultado.ok).toBe(false);
		expect(!resultado.ok && resultado.errores).toEqual([
			'Línea 2: falta el nombre del producto.',
			'Línea 3: el precio «mil» no es válido (usa solo números, por ejemplo 4500 o 4.500).',
			'Línea 4: el nombre no puede pasar de 80 caracteres.',
		]);
	});

	it('rechaza una descripción demasiado larga', () => {
		const resultado = interpretarLineas(`Té; 1000; ${'a'.repeat(301)}`);

		expect(!resultado.ok && resultado.errores[0]).toBe('Línea 1: la descripción no puede pasar de 300 caracteres.');
	});

	it('detecta productos repetidos sin distinguir mayúsculas, tildes ni espacios de más', () => {
		const resultado = interpretarLineas('Café; 1000\nTé; 1000\n  CAFE  ; 1200');

		expect(!resultado.ok && resultado.errores).toEqual(['Línea 3: «CAFE» está repetido (ya está en la línea 1).']);
	});

	it('limita cuántas líneas se cargan de una vez', () => {
		const texto = Array.from({ length: LINEAS_MAXIMAS + 1 }, (_, i) => `Producto ${i}`).join('\n');

		const resultado = interpretarLineas(texto);

		expect(!resultado.ok && resultado.errores).toEqual([`Son demasiadas líneas: carga hasta ${LINEAS_MAXIMAS} productos por vez.`]);
	});

	it('rechaza un precio por encima del máximo', () => {
		const resultado = interpretarLineas('Joya; 5.000.000');

		expect(!resultado.ok && resultado.errores[0]).toContain('Línea 1: el precio «5.000.000» no es válido');
	});
});
