import type { APIRoute } from 'astro';
import { NOMBRE_COOKIE_SESION } from '../../lib/auth/sesion.ts';

export const POST: APIRoute = ({ cookies, redirect }) => {
	cookies.delete(NOMBRE_COOKIE_SESION, { path: '/' });
	return redirect('/admin/login', 303);
};
