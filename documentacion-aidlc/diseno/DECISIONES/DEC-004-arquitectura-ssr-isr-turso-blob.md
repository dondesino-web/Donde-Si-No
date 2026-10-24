# DEC-004: SSR con caché ISR en Vercel, Turso + Drizzle, Vercel Blob y autenticación propia

## Definición del documento

- **Para qué sirve:** registra la arquitectura elegida para que la carta se edite desde un panel y siga siendo ultrarrápida.
- **Cuándo se crea o actualiza:** al pasar de un sitio estático a uno con datos editables.
- **Qué debe contener:** contexto, opciones, decisión, consecuencias y estado.

---

**Fecha:** 2026-10-22
**Estado:** Aceptado · validado por el responsable en la sesión 03 (panel propio + base de datos; hosting en Vercel)
**Responsable:** `jhonabruzzi278` (formalizado por agente de IA)

---

## 1. Contexto y problema

El dueño necesita cambiar precios, fotos y disponibilidad desde el celular, y que el cambio se publique al instante. A la vez, la carta debe cargar en menos de 1,5 s en 4G y ser legible para Google. Un sitio 100 % estático (DEC-001) no permite editar sin desplegar de nuevo.

## 2. Opciones consideradas

1. **Panel propio + base de datos, con SSR y caché ISR (elegida):**
   - Pro: cambios instantáneos y panel a la medida, con «agotado» en un toque.
   - Contra: más código propio (login, subidas).
2. **CMS sobre Git (Keystatic) con sitio estático:**
   - Pro: sin base de datos.
   - Contra: el panel es genérico y cada cambio tarda alrededor de un minuto, porque reconstruye el sitio.
3. **Mover el hosting a Cloudflare (Workers + D1 + R2):**
   - Pro: gratis también para uso comercial.
   - Contra: obliga a migrar el DNS. El responsable prefirió seguir en Vercel.

## 3. Decisión

| Pieza | Elección |
|---|---|
| Render | Astro 7 con `output: 'server'` y `@astrojs/vercel` 11 con ISR: expiración de 1 h, invalidación on-demand con `bypassToken` y rutas excluidas `/admin`, `/api/`, `/_actions/` y `/qr` |
| Datos | Turso (libSQL/SQLite) con `drizzle-orm`; migraciones con `drizzle-kit` en `drizzle/` |
| Fotos | Interfaz `AlmacenImagenes`: Vercel Blob en producción y disco local (`public/uploads/`) en desarrollo. El navegador comprime las fotos a WebP antes de subirlas. |
| Autenticación | Propia y mínima (Fase 2): hash `scrypt` en variable de entorno y cookie de sesión firmada con HMAC. Sin dependencias. |
| Configuración | `astro:env` valida los secretos del servidor. Ningún secreto llega al cliente. |
| Idiomas | i18n nativo de Astro: `es` sin prefijo y `en` en `/en/` |

## 4. Consecuencias

- **Positivas:**
  - La carta se sirve desde la caché de Vercel, como si fuera estática, y se regenera al guardar en el panel.
  - Desarrollo local sin Docker (SQLite en archivo).
  - Los tests usan las migraciones reales.
- **Negativas / riesgos:**
  - El plan Hobby de Vercel es solo para uso no comercial; para un negocio corresponde Pro (US$20/mes). ⚠️ Lo decide el responsable antes del lanzamiento.
  - Hay más superficie de seguridad (login, subidas), que se mitiga con revisiones de seguridad en cada fase.
  - `astro preview` no está soportado por el adaptador de Vercel. Para previsualizar se usan los Preview Deployments de Vercel.
- **Reemplaza parcialmente** a DEC-001 en lo que respecta a «SSG puro»: Astro sigue siendo el framework.
