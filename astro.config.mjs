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
			// Rutas que nunca se cachean: panel, API, acciones y el contador del QR.
			exclude: [/^\/admin(\/|$)/, /^\/api\//, /^\/_actions\//, '/qr'],
		},
	}),
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
			SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, min: 32 }),
		},
	},
});
