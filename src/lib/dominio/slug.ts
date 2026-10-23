const SLUG_POR_DEFECTO = 'categoria';

/** `«Té, café & jugos»` → `te-cafe-jugos`. Sirve de ancla en la URL de la categoría (`/#te-cafe-jugos`). */
export function slugificar(nombre: string): string {
	const slug = nombre
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || SLUG_POR_DEFECTO;
}
