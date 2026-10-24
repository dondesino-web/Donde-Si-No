// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

const { ISR_BYPASS_TOKEN } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// Vercel exige 32+ caracteres; sin token, guardar en el panel no refrescaría la carta hasta 1 h después.
if (process.env.VERCEL && (ISR_BYPASS_TOKEN?.length ?? 0) < 32) {
	console.warn('[dondesino] ISR_BYPASS_TOKEN falta o tiene menos de 32 caracteres: no habrá invalidación on-demand.');
}

// https://astro.build/config
export default defineConfig({
	site: 'https://www.donde-sino.com',
	output: 'server',
	adapter: vercel({
		isr: {
			// Permite invalidar la caché al guardar en el panel (HEAD con `x-prerender-revalidate`).
			bypassToken: ISR_BYPASS_TOKEN || undefined,
			// Red de seguridad: el «menú del día» depende de la fecha aunque nadie edite.
			expiration: 60 * 60,
			// Rutas que nunca se cachean: panel, API, acciones, el contador del QR y las fotos del almacén local (solo desarrollo).
			exclude: [/^\/admin(\/|$)/, /^\/api\//, /^\/_actions\//, /^\/uploads\//, '/qr'],
		},
	}),
	// La barra flotante de desarrollo tapa botones al pie de la página y estorba a las pruebas E2E.
	devToolbar: { enabled: false },
	// Rechaza POST de otro origen (CSRF). Es el valor por defecto; se explicita porque el panel depende de él.
	security: { checkOrigin: true },
	i18n: {
		locales: ['es', 'en'],
		defaultLocale: 'es',
		routing: { prefixDefaultLocale: false },
	},
	env: {
		schema: {
			TURSO_DATABASE_URL: envField.string({ context: 'server', access: 'secret', default: 'file:local.db' }),
			TURSO_AUTH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			BLOB_READ_WRITE_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Sin ambas, el panel queda desactivado (el login avisa en vez de abrirse sin contraseña).
			ADMIN_PASSWORD_HASH: envField.string({ context: 'server', access: 'secret', optional: true }),
			// El mismo token que usa el adaptador de Vercel: sin él, guardar en el panel no refresca la caché pública.
			ISR_BYPASS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Secreto con el que el cron diario de Vercel limpia las fotos huérfanas; sin él, esa ruta responde 503.
			CRON_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, min: 16 }),
			SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, min: 32 }),
		},
	},
});
