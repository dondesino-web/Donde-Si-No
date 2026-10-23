declare namespace App {
	interface Locals {
		/** `true` cuando la petición trae una cookie de sesión válida (la fija el middleware). */
		haySesion: boolean;
	}
}
