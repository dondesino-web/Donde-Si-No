# Infraestructura como Código y Despliegue (IaC)

## Definición del documento

- **Para qué sirve:** describe los recursos de nube, proveedores, configuraciones de servidor o pipelines de despliegue declarativo.
- **Cuándo se crea o actualiza:** en fases de Construcción Tardía / Operaciones.
- **Qué debe contener:** proveedores, archivos de configuración (Terraform, Dockerfile, GitHub Actions, vercel.json), entornos y variables.

---

## 1. Infraestructura y Hosting

| Recurso | Proveedor | Estado |
|---|---|---|
| Hosting, CDN y caché ISR | Vercel, equipo `donde-sino`, proyecto `donde-si-no`, conectado a `dondesino-web/Donde-Si-No` (rama `main`) | ✅ Activo en `https://www.donde-sino.com/` desde el 2026-10-24 |
| Dominio | Registrado en Amazon Registrar (AWS Route 53), vence el 2027-03-10; DNS en Vercel (equipo `donde-sino`) | ✅ Activo |
| SSL | Vercel (certificado automático de Let's Encrypt) | ✅ Activo |
| Base de datos | Turso (libSQL), base `dondesino-rosalia` en AWS us-east-1 | ✅ Activa |
| Fotos | Vercel Blob (store público) | ✅ Conectado |

> ⚠️ **Plan de Vercel:** el plan Hobby es solo para uso no comercial. Para la web de un negocio corresponde Pro (US$20/mes). **El responsable eligió Hobby (2026-10-24)** asumiendo ese riesgo: Vercel podría limitar o suspender el proyecto.

---

## 2. Parámetros de Despliegue en Vercel

- **Framework preset:** Astro
- **Build:** `npm run build` (`astro build`, genera `.vercel/output/` con el adaptador `@astrojs/vercel`)
- **Instalación:** `npm install`
- **Node.js:** 22.23.4 o superior (campo `engines` en `package.json`)
- **Funciones:**
  - `_isr`: la carta pública, cacheada; expira a la hora y se invalida on-demand.
  - `_render`: panel, API y `/qr`, sin caché.
- **Previsualización:** Preview Deployments de Vercel. El adaptador no soporta `astro preview`.

---

## 3. Variables de Entorno

Plantilla en [`.env.example`](../../.env.example). En Vercel se cargan en *Project Settings → Environment Variables*; qué entorno lleva cada una (Production y Preview) está en la sección 1 de la [lista de verificación de despliegue](./LISTA_VERIFICACION_DESPLIEGUE.md).

| Variable | Uso | Requerida en producción |
|---|---|---|
| `TURSO_DATABASE_URL` | URL `libsql://…` de Turso. En local, `file:local.db`. | Sí (la app rechaza `file:` en producción) |
| `TURSO_AUTH_TOKEN` | Token de Turso | Sí |
| `BLOB_READ_WRITE_TOKEN` | Store de Vercel Blob (lo crea la integración de Vercel) | Sí (sin él, la subida de fotos falla en lugar de escribir en disco) |
| `ISR_BYPASS_TOKEN` | Secreto de 32 o más caracteres para invalidar la caché al guardar | Sí, desde la Fase 2 (hoy el build solo advierte si falta) |
| `ADMIN_PASSWORD_HASH` | Hash scrypt de la contraseña del panel | Sí, desde la Fase 2 |
| `SESSION_SECRET` | Firma de la cookie de sesión, de las subidas de fotos y HMAC de IPs | Sí, desde la Fase 2 |
| `CRON_SECRET` | Secreto (16 o más caracteres) con el que el cron diario de Vercel limpia las fotos huérfanas; sin él, esa ruta responde 503 | Sí, desde la Fase 4 |

Los cuatro secretos deben ser distintos entre sí. `node --env-file=<archivo> scripts/verificar-entorno.ts` (o `npm run entorno:verificar`) revisa que estén completos y bien formados sin mostrar sus valores.

---

## 4. Migraciones y datos

El build **no** aplica migraciones. Cuando cambia el esquema, antes de desplegar:

```bash
npm run db:generate                                               # crea la migración SQL en drizzle/
TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:migrate        # la aplica en Turso
TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:seed           # solo la primera vez (idempotente)
```

`db:seed` muestra a qué base se conecta antes de escribir.

---

## 5. Archivos de configuración

| Archivo | Para qué |
|---|---|
| `vercel.json` | Cron diario `/api/cron/limpiar-fotos` (07:17 UTC) y cabeceras de seguridad para todos los archivos |
| `.github/workflows/ci.yml` | CI: tipos, esquema y migraciones sincronizados, cobertura, build, auditoría y E2E |
| `astro.config.mjs` | Adaptador de Vercel con ISR (solo la carta pública), i18n y `astro:env` |
| `playwright.config.ts` | E2E con su propio servidor en el puerto 4399 y secretos efímeros |

---

## 6. Estado de la Infraestructura

- **Producción:** la carta está publicada en `https://www.donde-sino.com` desde el 2026-10-24 (fusión del PR #1, commit `b073561`). `donde-sino.com` redirige a `www`.
- **Recursos:** Turso, Vercel Blob y las variables de entorno están configurados en el proyecto del equipo `donde-sino`.
- **Preview:** comparte la base y el store con producción; ver la advertencia en la [lista de verificación de despliegue](./LISTA_VERIFICACION_DESPLIEGUE.md).
