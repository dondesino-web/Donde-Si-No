# Lista de Verificación de Despliegue

## Definición del documento

- **Para qué sirve:** guía el proceso de paso a producción asegurando que no se omitan pasos críticos de seguridad, build o configuración.
- **Cuándo se crea o actualiza:** en fases de Construcción Tardía / Operaciones y antes de cada release productiva.
- **Qué debe contener:** lista de comprobación de build, secretos, pruebas, optimizaciones y reversión.

---

## 1. Estado de Despliegue (2026-10-24)

- **Publicada:** la carta está en producción desde el **2026-10-24** en `https://www.donde-sino.com`. `donde-sino.com` y `http://` redirigen a `https://www.` con un 308. Entró al fusionar el PR #1 a `main` (commit `b073561`) con el CI en verde.
- **Repositorio:** `dondesino-web/Donde-Si-No`, en la cuenta de GitHub del negocio. La dirección anterior (`jhonabruzzi278/Donde-Si-No`) redirige a la nueva.
- **Vercel:** equipo **`donde-sino`**, proyecto **`donde-si-no`** (preset Astro), con la dirección propia `donde-si-no-sandy.vercel.app`. Cada push a `main` despliega producción y cada Pull Request crea un *Preview Deployment*. El proyecto anterior, del equipo «Jonathan's projects», se borró.
- **Dominio:** comprado en **Amazon Registrar (AWS Route 53)** el 2025-03-10. **Vence el 2027-03-10** y se renueva en AWS, no en Vercel. Usa los nameservers de Vercel (`ns1.vercel-dns.com` y `ns2.vercel-dns.com`), y su DNS se administra en el equipo `donde-sino`. No tiene correo (no hay registros MX). Vercel emite y renueva el certificado (Let's Encrypt, para `donde-sino.com` y `*.donde-sino.com`).
- **Base de datos:** Turso, base `dondesino-rosalia` (AWS us-east-1), con las migraciones y la semilla aplicadas.
- **Fotos:** un store de Vercel Blob conectado al proyecto.
- **Protección de despliegues:** los *Preview Deployments* piden iniciar sesión en Vercel. Los dominios propios y `donde-si-no-sandy.vercel.app` son públicos.

### Variables cargadas en Vercel

| Variable | Production | Preview | Nota |
|---|---|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | ✅ | ✅ | Cargadas a mano: la base se creó en turso.tech, no desde el Marketplace de Vercel |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ | La crea Vercel al conectar el store y la marca como *sensitive*: su valor ya no se puede ver |
| `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY` | ✅ | ✅ | También las crea Vercel con el store; la app no las usa |
| `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` | ✅ | ✅ | |
| `ISR_BYPASS_TOKEN`, `CRON_SECRET` | ✅ | — | Solo producción |

> ⚠️ **Preview comparte la base y el store de fotos con producción.** Lo que se edite en el panel de un *preview* queda guardado de verdad en la carta publicada. Además, sin `ISR_BYPASS_TOKEN`, la carta de un *preview* tarda hasta 1 h en mostrar los cambios del panel (en producción es inmediato). La limpieza de fotos no corre peligro: el cron solo se ejecuta en producción y, como Preview usa la misma base, ninguna foto subida desde un *preview* parece huérfana. Antes de abrir Pull Requests que toquen datos, conviene darle a Preview una base de Turso y un store de Blob propios.

---

## 2. Cómo se publica

> ⚠️ **Primero la base de datos y las variables; después, la fusión a `main`.** En producción la app se niega a arrancar con una base local (a propósito). Si se fusiona antes de configurar Turso y las variables, el sitio responderá con error hasta que estén.

### Paso 1 · Decidir el plan de Vercel
**Decisión del responsable (2026-10-24): usar el plan Hobby.** Sus términos lo limitan a uso personal y no comercial, y la web de un negocio cae fuera de eso: Vercel puede limitar o suspender el proyecto, y la web podría caer sin aviso previo. El riesgo está asumido. Si Vercel lo pide, o cuando el negocio dependa de la carta, se pasa a Pro (US$20 al mes) sin tocar el código. La app funciona igual en Hobby, y el cron diario también (en Hobby corre una vez al día, en una ventana de una hora).

### Paso 2 · Crear la base de datos en Turso
- Desde Vercel → *Storage* / *Marketplace* → **Turso** (crea la base y carga `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en el proyecto), o bien en turso.tech. Si se crea en turso.tech, como se hizo el 2026-10-24, las dos variables se cargan a mano en Vercel.
- Aplicar las migraciones y la semilla **desde tu computador**, apuntando a Turso:
  ```bash
  TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:migrate
  TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:seed
  ```
  La semilla muestra el *host* al que se conecta: confírmalo antes de seguir. Es idempotente: si la base ya tenía datos, no los toca.
- **Si un token se expone** (por ejemplo, al pegarlo en un chat), invalídalo en Turso y crea uno nuevo antes de cargarlo en Vercel.

### Paso 3 · Crear el store de Vercel Blob
Vercel → proyecto → *Storage* → *Create* → **Blob** → conectarlo al proyecto (Production y Preview). Eso carga `BLOB_READ_WRITE_TOKEN`.
- El acceso tiene que ser **público**: la app sube las fotos con `access: 'public'` y la carta las muestra a cualquiera. Con un store privado, la subida falla.
- Vercel marca el token como *sensitive*, así que después no se puede ver. No hace falta: la app lo lee igual.

### Paso 4 · Generar los secretos
```bash
npm run admin:hash        # pide la contraseña (12+ caracteres) y da ADMIN_PASSWORD_HASH y SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # ISR_BYPASS_TOKEN
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # CRON_SECRET
```
Los **cuatro secretos deben ser distintos**. Cárgalos en *Settings → Environment Variables* de Vercel según la tabla de la sección 1: `ISR_BYPASS_TOKEN` y `CRON_SECRET` **solo en Production**. Pega solo el valor, sin comillas ni espacios; el `$` del hash se pega tal cual en el panel de Vercel.

- `npm run admin:hash` lee la contraseña sin mostrarla. Si te equivocas al escribir, no borres: pulsa `Ctrl+C` y empieza de nuevo, porque el script solo reconoce el borrado que envía la tecla como `DEL` y en algunas terminales puede entrar como un carácter más de la contraseña.
- Guarda la contraseña del panel en un gestor de contraseñas: el hash no permite recuperarla.
- **Cerrar todas las sesiones del panel** = cambiar `SESSION_SECRET` en Vercel y volver a desplegar.

### Paso 5 · Verificar las variables antes de desplegar
Con los valores en un archivo temporal que **no se sube** (`.env.produccion`, ya ignorado por git):
```bash
node --env-file=.env.produccion scripts/verificar-entorno.ts
```
Debe terminar con «✅ El entorno de producción está completo y bien formado». Nunca imprime los valores. Borra el archivo después.

- Córrelo en una **terminal nueva**: `--env-file` no reemplaza las variables que la terminal ya tenga cargadas, así que podrías estar verificando valores viejos.
- Como `BLOB_READ_WRITE_TOKEN` es *sensitive* y no se puede copiar, déjalo vacío en el archivo. El único error esperado es «Falta BLOB_READ_WRITE_TOKEN», y no hay riesgo: ese token lo cargó Vercel, no se copió a mano.

### Paso 6 · Volver a desplegar y revisar el *preview*
- Un despliegue **no toma las variables que se cargan después**. Tras cargarlas o cambiarlas: *Deployments* → el último → **⋯** → **Redeploy**.
- Abre el *preview* desde el botón **Visit** de ese despliegue. Los enlaces de los comentarios del PR apuntan a la versión anterior al *Redeploy*.
- Haz el recorrido de la sección 4 (con sesión de Vercel).

### Paso 7 · Fusionar a `main` (producción)
Con el CI en verde y el *preview* revisado. Vercel despliega solo. Si algo falla: **Instant Rollback** en Vercel (las migraciones son aditivas, no hay que deshacer la base).

### Paso 8 · Conectar el dominio
En el proyecto → *Settings* → *Domains*:
1. **Add** `www.donde-sino.com` en Production.
2. **Add** `donde-sino.com` con **Redirect to `www.donde-sino.com`**.

Mientras el dominio no está conectado a ningún proyecto, responde `DEPLOYMENT_NOT_FOUND`.

**Si el dominio está en otro equipo o cuenta de Vercel** (lo que pasó el 2026-10-24, cuando el repositorio se conectó a un proyecto nuevo en el equipo `donde-sino` y el dominio seguía en «Jonathan's projects»):
- **Claim con registro TXT:** Vercel pide un TXT `_vercel` en el DNS del dominio. Se agregó en el equipo de origen, pero Vercel nunca lo publicó (se esperó más de 15 minutos), así que «Verify & Claim» no funcionó.
- **Quitar el dominio del equipo de origen:** no se puede mientras use los nameservers de Vercel.
- **Lo que funcionó: Move Domain.** En el equipo de origen: *Domains* → **⋯** junto al dominio → **Move**, y como destino el *slug* del equipo nuevo (`donde-sino`, el que aparece en `vercel.com/donde-sino/…`). El buscador mostró «No results», pero el traslado se completó igual. El dominio pasa con su DNS, y después se conecta al proyecto como arriba.
- **Si Move no está disponible:** crear una *hosted zone* en AWS Route 53, copiar ahí los registros que pide Vercel y cambiar los nameservers del dominio en Amazon Registrar. Así el DNS deja de depender de una cuenta de Vercel.

### Paso 9 · Después del lanzamiento
- Cargar en `/admin`: **precios, fotos, horario y redes** (sin precios la carta dice «Consultar»).
- Para crear muchos productos de una vez usa **Carga rápida** (`/admin/carga-rapida`): una línea por producto, `nombre; precio; descripción`.
- Para actualizar la carta con Excel: en **Carga rápida → Con Excel**, descarga la planilla, modifícala y súbela; el panel muestra un resumen antes de guardar. Nunca borra productos.
- Regla de **Firewall → Rate Limit** en Vercel para `/qr` y `/api/evento` (por ejemplo 30 por minuto por IP).
- Probar el QR impreso en el tamaño final con varios celulares y recién ahí imprimir las tarjetas de mesa.
- En la ficha de Google: agregar `https://www.donde-sino.com` como sitio web y como enlace de menú.
- Borrar el TXT `_vercel` que quedó del intento de claim (*Domains* → `donde-sino.com` → *DNS Records*).

---

## 3. Checklist de Verificación de Producción

### Hecho y verificado
- [x] **Dominio y certificado SSL** de `www.donde-sino.com`, conectado al proyecto del equipo `donde-sino`. `donde-sino.com` y `http://` redirigen con 308 (2026-10-24).
- [x] **Compilación:** `npm run build` genera `.vercel/output/` sin errores.
- [x] **Tipado estricto:** `npm run check` sin errores, avisos ni sugerencias.
- [x] **Tests:** 498 tests unitarios y de integración; `npm run test:coverage` con ≈ 98 % de cobertura de `src/lib` (mínimo exigido: 80 %).
- [x] **E2E:** 113 pruebas de Playwright y axe (flujos críticos, WCAG 2.2 AA).
- [x] **CI** (`.github/workflows/ci.yml`) en verde en GitHub sobre el PR #1: tipos, tests y build, y E2E.
- [x] **Sin secretos en el repositorio:** `.env*` ignorados salvo `.env.example`; los secretos se leen con `astro:env`.
- [x] **Plan de Vercel:** el responsable eligió **Hobby** conociendo que sus términos excluyen el uso comercial. Revisar si Vercel lo pide.
- [x] **Turso:** base `dondesino-rosalia` creada, migraciones aplicadas y semilla cargada.
- [x] **Vercel Blob:** store creado y conectado; `BLOB_READ_WRITE_TOKEN` cargado por Vercel.
- [x] **Secretos:** `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `ISR_BYPASS_TOKEN` y `CRON_SECRET` cargados y verificados con `scripts/verificar-entorno.ts` (con el token de Blob vacío, ver el paso 5).
- [x] **Rutas en `.vercel/output/config.json`:** solo la carta pública (`/`, `/en/`, `/imprimir`, `/en/print`, `robots.txt`, `sitemap.xml` y la 404) pasa por `_isr`; el panel, las acciones, `/qr`, `/api/*` y `/uploads/*` van por `_render`.
- [x] **En producción (2026-10-24):** responden 200 `/`, `/en/`, `/imprimir`, `/en/print`, `/admin/login`, `robots.txt` y `sitemap.xml`; una ruta inexistente da la 404 propia; `/api/cron/limpiar-fotos` sin secreto responde 401. La carta se ve bien en un celular (375 px).
- [x] **Cabeceras de seguridad** en `/` (CSP acotada, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) y en los archivos de `/_astro/`, que además se cachean un año como `immutable`.
- [x] **SEO:** el `sitemap.xml` y la etiqueta `canonical` usan `https://www.donde-sino.com`.
- [x] **Lighthouse (build empaquetado, móvil con red lenta simulada):** 100 en Rendimiento, Accesibilidad, Buenas prácticas y SEO en `/`, `/en/` y `/imprimir`; LCP 1,2 s, CLS 0, TBT 0 ms. *Medido sin fotos de platos y sin la red de Vercel: repetir en producción.*
- [x] **Presupuesto de bytes:** HTML ≈ 6 KB, CSS ≈ 1,7 KB y JS ≈ 1,1 KB (gzip) en la carta; el plan fija 50 KB.
- [x] **Plan de reversión:** Instant Rollback de Vercel.

### Por hacer (lo hace el responsable)
- [ ] **Revalidación ISR en producción:** guardar un cambio en el panel y ver que la carta lo muestre en segundos.
- [ ] **Subida de fotos** a Vercel Blob desde el panel (confirma también que el store es público).
- [ ] **`/qr`** redirige a la carta y suma un escaneo en `/admin/estadisticas`.
- [ ] **Cron diario** `/api/cron/limpiar-fotos` visible en Vercel → *Settings → Cron Jobs*.
- [ ] **Límite de tasa** en Vercel Firewall para `/qr` y `/api/evento`.
- [ ] **Lighthouse en producción** con fotos reales: ≥ 95 en las cuatro categorías.
- [ ] **JSON-LD** validado con el Rich Results Test de Google.
- [ ] **Ficha de Google:** enlazar `www.donde-sino.com` como sitio web y como menú.
- [ ] **Borrar el TXT `_vercel`** sobrante del DNS.

---

## 4. Recorrido de prueba (en producción y en cada *preview*)

1. `/` y `/en/` cargan; el pie dice «Horario por confirmar» hasta cargar el horario.
2. `/admin/login`: una contraseña incorrecta falla y la correcta entra. Tras 5 intentos fallidos el login se bloquea un rato: no lo pruebes con la cuenta real.
3. Cambiar un precio y marcar «Agotado» en `/admin/carta`: la carta pública lo refleja en pocos segundos (**prueba la revalidación ISR**). En un *preview* tarda hasta 1 h, porque ahí no hay `ISR_BYPASS_TOKEN`; si en producción tarda, revisar esa variable.
4. Subir una foto de un producto: se ve en la carta, y las fotos van a Vercel Blob.
5. `/qr` redirige a `/` y suma un escaneo en `/admin/estadisticas`.
6. `/admin/qr`: el QR se ve y se descarga en SVG y PNG.
7. Solo en producción: `/api/cron/limpiar-fotos` sin secreto responde 401; con `Authorization: Bearer <CRON_SECRET>` responde 200.
8. Abrir la carta desde un celular Android y un iPhone (la subida de fotos desde Safari puede no funcionar: ver `HOJA_RUTA.md`).

> Mientras Preview comparta la base con producción (sección 1), lo que se cambie en el recorrido de un *preview* queda en la carta publicada, y el escaneo del paso 5 se suma a las estadísticas reales.

---

## 5. Pendientes conocidos

- Ver [`HOJA_RUTA.md`](../../HOJA_RUTA.md): CSP completa (probarla primero en modo solo-reporte en un *preview*, porque Astro solo la genera en `build` y no se puede probar con el servidor de desarrollo), Safari en iPhone y avisos de `npm audit` aceptados en [`NOTAS_REVISION_CODIGO.md`](../generacion-codigo/NOTAS_REVISION_CODIGO.md).
- Darle a Preview una base de Turso y un store de Blob propios (sección 1).
- El registro del dominio sigue en la cuenta de AWS donde se compró: pasarlo a nombre del negocio y revisar la renovación antes del 2027-03-10.
