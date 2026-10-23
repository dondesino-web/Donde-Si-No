# Infraestructura como Código y Despliegue (IaC)

## Definición del documento

- **Para qué sirve:** describe los recursos de nube, proveedores, configuraciones de servidor o pipelines de despliegue declarativo.
- **Cuándo se crea o actualiza:** en fases de Construcción Tardía / Operaciones.
- **Qué debe contener:** proveedores, archivos de configuración (Terraform, Dockerfile, GitHub Actions, vercel.json), entornos y variables.

---

## 1. Infraestructura y Hosting

| Recurso | Proveedor | Estado |
|---|---|---|
| Hosting, CDN y caché ISR | Vercel, proyecto conectado a `jhonabruzzi278/Donde-Si-No` (rama `main`) | ✅ Activo en `https://www.donde-sino.com/` |
| Dominio y SSL | Vercel (certificado automático) | ✅ Activo |
| Base de datos | Turso (libSQL) | ⏳ Por crear (Fase 4) |
| Fotos | Vercel Blob (store público) | ⏳ Por crear (Fase 4) |

> ⚠️ **Plan de Vercel:** el plan Hobby es solo para uso no comercial. Para la web de un negocio corresponde Pro (US$20/mes). Lo decide el responsable antes del lanzamiento.

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

Plantilla en [`.env.example`](../../.env.example). En Vercel se cargan en *Project Settings → Environment Variables*.

| Variable | Uso | Requerida en producción |
|---|---|---|
| `TURSO_DATABASE_URL` | URL `libsql://…` de Turso. En local, `file:local.db`. | Sí (la app rechaza `file:` en producción) |
| `TURSO_AUTH_TOKEN` | Token de Turso | Sí |
| `BLOB_READ_WRITE_TOKEN` | Store de Vercel Blob (lo crea la integración de Vercel) | Sí (sin él, la subida de fotos falla en lugar de escribir en disco) |
| `ISR_BYPASS_TOKEN` | Secreto de 32 o más caracteres para invalidar la caché al guardar | Sí, desde la Fase 2 (hoy el build solo advierte si falta) |
| `ADMIN_PASSWORD_HASH` | Hash scrypt de la contraseña del panel | Sí, desde la Fase 2 |
| `SESSION_SECRET` | Firma de la cookie de sesión y HMAC de IPs | Sí, desde la Fase 2 |

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

## 5. Estado de la Infraestructura

- **Producción:** activa con la portada provisional.
- **Fase 0:** el proyecto ya compila con el adaptador de Vercel y el ISR configurado. Faltan los recursos de Turso y Blob, y las variables de entorno.
