/**
 * Genera el valor de `ADMIN_PASSWORD_HASH` (`npm run admin:hash`).
 * Pide la contraseña sin mostrarla y no la guarda en ningún lado: copia el resultado a `.env` o a Vercel.
 */
import { randomBytes } from 'node:crypto';
import { hashearPassword } from '../src/lib/auth/password.ts';

function pedirOculto(pregunta: string): Promise<string> {
	return new Promise((resolver, rechazar) => {
		const { stdin, stdout } = process;
		if (!stdin.isTTY) return rechazar(new Error('Ejecuta este script en una terminal interactiva.'));

		stdout.write(pregunta);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');

		let texto = '';
		const alTeclear = (tecla: string) => {
			for (const caracter of tecla) {
				if (caracter === '\u0003') {
					// Ctrl+C
					stdin.setRawMode(false);
					return rechazar(new Error('Cancelado.'));
				}
				if (caracter === '\r' || caracter === '\n') {
					stdin.setRawMode(false);
					stdin.pause();
					stdin.off('data', alTeclear);
					stdout.write('\n');
					return resolver(texto);
				}
				texto = caracter === '\u007f' ? texto.slice(0, -1) : texto + caracter;
			}
		};
		stdin.on('data', alTeclear);
	});
}

try {
	const password = await pedirOculto('Contraseña del administrador (mínimo 12 caracteres): ');
	const confirmacion = await pedirOculto('Repítela: ');
	if (password !== confirmacion) throw new Error('Las contraseñas no coinciden.');

	console.info('\nADMIN_PASSWORD_HASH=' + (await hashearPassword(password)));
	console.info('SESSION_SECRET=' + randomBytes(32).toString('base64url'));
	console.info('\nSi el hash contiene «$», en .env enciérralo entre comillas simples.');
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
