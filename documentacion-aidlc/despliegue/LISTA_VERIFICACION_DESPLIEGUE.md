# Lista de Verificación de Despliegue

## Definición del documento

- **Para qué sirve:** guía el proceso de paso a producción asegurando que no se omitan pasos críticos de seguridad, build o configuración.
- **Cuándo se crea o actualiza:** en fases de Construcción Tardía / Operaciones y antes de cada release productiva.
- **Qué debe contener:** lista de comprobación de build, secretos, pruebas, optimizaciones y reversión.

---

## 1. Estado de Despliegue (2026-10-24)

- **Código:** las Fases 0 a 3 están terminadas en la rama `feat/carta-digital-fase-0`; **no se ha subido a GitHub** ni hay Pull Request.
- **Vercel:** el proyecto `donde-si-no` ya existe (equipo «Jonathan's projects», preset Astro, Node 22). Los dominios `www.donde-sino.com` y `donde-sino.com` (que redirige al `www`) están verificados.
- **Lo que se ve hoy en producción:** el único despliegue es el commit inicial de la plantilla de Astro (`6d106ce`). La carta aún **no** está publicada.
- **Protección de despliegues:** los *Preview Deployments* piden iniciar sesión en Vercel (SSO); los dominios propios quedan públicos.
- **No verificado:** qué variables de entorno hay cargadas en el proyecto (el conector de Vercel no tuvo permiso para listarlas).

---

## 2. Orden del lanzamiento

> ⚠️ **Primero la base de datos y las variables; después, la fusión a `main`.** En producción la app se niega a arrancar con una base local (a propósito). Si se fusiona antes de configurar Turso y las variables, el sitio responderá con error hasta que estén.

### Paso 1 · Decidir el plan de Vercel
El plan Hobby es solo para uso no comercial. Para la web de un negocio corresponde Pro. Lo decide el responsable. (El cron diario funciona en ambos.)

### Paso 2 · Crear la base de datos en Turso
- Desde Vercel → *Storage* / *Marketplace* → **Turso** (crea la base y carga `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en el proyecto), o bien desde turso.tech con su CLI.
- Aplicar las migraciones y la semilla **desde tu computador**, apuntando a Turso:
  ```bash
  TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:migrate
  TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:seed
  ```
  La semilla muestra el *host* al que se conecta: confírmalo antes de seguir. Es idempotente: si la base ya tenía datos, no los toca.

### Paso 3 · Crear el store de Vercel Blob
Vercel → proyecto → *Storage* → *Create* → **Blob** (público) → conectarlo al proyecto. Eso carga `BLOB_READ_WRITE_TOKEN`.

### Paso 4 · Generar los secretos
```bash
npm run admin:hash        # pide la contraseña (12+ caracteres) y da ADMIN_PASSWORD_HASH y SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # ISR_BYPASS_TOKEN
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # CRON_SECRET
```
Los **cuatro secretos deben ser distintos**. Cárgalos en *Settings → Environment Variables* de Vercel (Production y Preview). Pega solo el valor, sin comillas ni espacios; el `$` del hash se pega tal cual en el panel de Vercel.

> **Entornos Preview.** Usa una base de Turso y un store de Blob **distintos** para Preview, o no cargues allí las de producción. Tampoco definas `CRON_SECRET` ni `ISR_BYPASS_TOKEN` en Preview. Motivo: el cron diario borra del store las fotos que la base de *su* entorno no usa; si un Preview compartiera el store con producción pero tuviera otra base, las fotos de producción le parecerían huérfanas. La limpieza tiene frenos (solo archivos de más de un día, 100 por vez, y se detiene si todo parece huérfano), pero no hay que depender de ellos.
>
> **Cerrar todas las sesiones del panel** = cambiar `SESSION_SECRET` en Vercel y volver a desplegar.

### Paso 5 · Verificar las variables antes de desplegar
Con los valores en un archivo temporal que **no se sube** (`.env.produccion`, ya ignorado por git):
```bash
node --env-file=.env.produccion scripts/verificar-entorno.ts
```
Debe terminar con «✅ El entorno de producción está completo y bien formado». Nunca imprime los valores. Borra el archivo después.

### Paso 6 · Subir la rama y revisar el *preview*
- `git push -u origin feat/carta-digital-fase-0` y abrir un Pull Request hacia `main`: corre el CI (`.github/workflows/ci.yml`) y Vercel crea un *Preview Deployment*.
- En el preview (con sesión de Vercel) comprobar el recorrido de la sección 4.

### Paso 7 · Fusionar a `main` (producción)
Con el CI en verde y el preview revisado. Vercel despliega solo. Si algo falla: **Instant Rollback** en Vercel (las migraciones son aditivas, no hay que deshacer la base).

### Paso 8 · Después del lanzamiento
- Cargar en `/admin`: **precios, fotos, horario y redes** (sin precios la carta dice «Consultar»).
- Regla de **Firewall → Rate Limit** en Vercel para `/qr` y `/api/evento` (por ejemplo 30 por minuto por IP).
- Probar el QR impreso en el tamaño final con varios celulares y recién ahí imprimir las tarjetas de mesa.
- En la ficha de Google: agregar `https://www.donde-sino.com` como sitio web y como enlace de menú.

---

## 3. Checklist de Verificación de Producción

### Hecho y verificado
- [x] **Dominio y certificado SSL** de `www.donde-sino.com` (verificado en Vercel).
- [x] **Compilación:** `npm run build` genera `.vercel/output/` sin errores.
- [x] **Tipado estricto:** `npm run check` sin errores, avisos ni sugerencias.
- [x] **Tests:** 498 tests unitarios y de integración; `npm run test:coverage` con ≈ 98 % de cobertura de `src/lib` (mínimo exigido: 80 %).
- [x] **E2E:** 113 pruebas de Playwright y axe (flujos críticos, WCAG 2.2 AA).
- [x] **CI definido:** `.github/workflows/ci.yml` (tipos, cobertura, build, auditoría de dependencias y E2E). *Todavía no se ha ejecutado en GitHub.*
- [x] **Sin secretos en el repositorio:** `.env*` ignorados salvo `.env.example`; los secretos se leen con `astro:env`.
- [x] **Rutas en `.vercel/output/config.json`:** solo la carta pública (`/`, `/en/`, `/imprimir`, `/en/print`, `robots.txt`, `sitemap.xml` y la 404) pasa por `_isr`; el panel, las acciones, `/qr`, `/api/*` y `/uploads/*` van por `_render`.
- [x] **Lighthouse (build empaquetado, móvil con red lenta simulada):** 100 en Rendimiento, Accesibilidad, Buenas prácticas y SEO en `/`, `/en/` y `/imprimir`; LCP 1,2 s, CLS 0, TBT 0 ms. *Medido sin fotos de platos y sin la red de Vercel: repetir en el preview.*
- [x] **Cabeceras para los archivos estáticos:** `vercel.json` repite las cabeceras de seguridad del middleware (que solo cubre las rutas dinámicas). Comprobar en el preview con `curl -I` sobre `/` y sobre un archivo de `/_astro/`.
- [x] **Presupuesto de bytes:** HTML ≈ 6 KB, CSS ≈ 1,7 KB y JS ≈ 1,1 KB (gzip) en la carta; el plan fija 50 KB.
- [x] **Plan de reversión:** Instant Rollback de Vercel.

### Por hacer en el lanzamiento (ver sección 2)
- [ ] **Plan de Vercel** adecuado para uso comercial (Pro).
- [ ] **Turso:** base creada, migraciones aplicadas y semilla cargada.
- [ ] **Vercel Blob:** store creado y `BLOB_READ_WRITE_TOKEN` configurado.
- [ ] **Secretos:** `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `ISR_BYPASS_TOKEN` (≥ 32 caracteres) y `CRON_SECRET` (≥ 16), todos distintos; `npm run entorno:verificar` en verde.
- [ ] **CI** en verde en GitHub sobre el Pull Request.
- [ ] **Lighthouse en el preview** de Vercel con fotos reales: ≥ 95 en las cuatro categorías.
- [ ] **Cron diario** `/api/cron/limpiar-fotos` visible en Vercel → *Settings → Cron Jobs* tras el primer despliegue.
- [ ] **Límite de tasa** en Vercel Firewall para `/qr` y `/api/evento`.
- [ ] **Ficha de Google:** enlazar `www.donde-sino.com` como sitio web y como menú.

---

## 4. Recorrido de prueba en el *preview* (antes de fusionar)

1. `https://<preview>/` y `/en/` cargan; el pie dice «Horario por confirmar» hasta cargar el horario.
2. `/admin/login`: contraseña incorrecta falla; tras 5 intentos fallidos se bloquea; la correcta entra.
3. Cambiar un precio y marcar «Agotado» en `/admin/carta`: la carta pública lo refleja en pocos segundos (**prueba la revalidación ISR**; si tarda una hora, revisar `ISR_BYPASS_TOKEN`).
4. Subir una foto de un producto: se ve en la carta, y las fotos van a Vercel Blob.
5. `/qr` redirige a `/` y suma un escaneo en `/admin/estadisticas`.
6. `/admin/qr`: el QR se ve y se descarga en SVG y PNG.
7. `/api/cron/limpiar-fotos` sin secreto responde 401; con `Authorization: Bearer <CRON_SECRET>` responde 200.
8. Abrir la carta desde un celular real y un iPhone (la subida de fotos desde Safari puede no funcionar: ver `HOJA_RUTA.md`).

---

## 5. Pendientes conocidos

Ver [`HOJA_RUTA.md`](../../HOJA_RUTA.md): CSP completa (probar primero en modo solo-reporte en el preview, porque Astro solo la genera en `build` y no se puede probar con el servidor de desarrollo), Safari en iPhone y avisos de `npm audit` aceptados en [`NOTAS_REVISION_CODIGO.md`](../generacion-codigo/NOTAS_REVISION_CODIGO.md).
