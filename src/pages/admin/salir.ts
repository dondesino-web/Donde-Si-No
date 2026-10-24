import type { APIRoute } from 'astro';
import { nombreCookieSesion } from '../../lib/auth/sesion.ts';

export const POST: APIRoute = ({ cookies, redirect }) => {
	// Con el prefijo __Host- hasta la cookie de borrado debe ser Secure.
	cookies.delete(nombreCookieSesion(import.meta.env.PROD), { path: '/', secure: import.meta.env.PROD });
	return redirect('/admin/login', 303);
};
