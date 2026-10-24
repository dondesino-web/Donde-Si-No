# Plan: Carta digital QR para «Dónde Si No»

**Estado:** Aprobado por el responsable (2026-10-22) · **Fase 0 terminada (2026-10-23)**  
**Fecha:** 2026-10-22  
**Decisiones validadas por el responsable (2026-10-22):** panel propio con base de datos · hosting en Vercel · MVP con estadísticas, versión imprimible e inglés (sin pedido por WhatsApp).

---

## 1. Contexto

`donde-sino.com` (Vercel, Astro 7) hoy solo sirve la plantilla vacía de Astro. La documentación AI-DLC **infirió** que el proyecto era una «plataforma de recomendaciones Dónde Sí / Dónde No». **No es así:** es la web de **Dónde Si No**, un local de comida rápida y colaciones en Chocalán, Melipilla.

**Objetivo:** una carta digital en código QR, inspirada en QrCarta:

- **Pública:** mobile-first, minimalista, accesible (WCAG 2.2 AA), ultrarrápida y visible en Google.
- **Panel de administración:** sencillo y pensado para el celular, para que el dueño cambie precios, fotos, promociones y disponibilidad sin tocar código. Los cambios se publican al instante.

### Datos del negocio

**Extraídos** de la ficha de Google y de los afiches del local:

| Campo | Valor |
|---|---|
| Nombre | Dónde Si No (el logo dice «Donde Si nó») |
| Eslogan | «¡Aquí hay sabor!» |
| Dirección | Ruta G60 Km 3 (Camino a Rapel), Chocalán, Melipilla, Región Metropolitana. Google indica el código postal 8320000, que corresponde a Santiago centro; queda por confirmar. |
| Teléfono | +56 9 8886 0939 |
| Horario | Cierra a la 1 a.m. (falta el horario completo) |
| Precio por persona | $5.000–10.000 |
| Servicios | Consumo en el local y para llevar · Wi-Fi · Pet Friendly · Baños |
| Otros canales | Tienda en Uber Eats |
| Ficha de Google | Sin sitio web enlazado: oportunidad para enlazar `donde-sino.com` |
| Productos (afiches) | Desayunos, colaciones, churrascos (**promo 2x1**), as y completos, hamburguesas, papas fritas, fajitas, salchipapas, chorrillanas, pollo con papas fritas, empanadas, jugos naturales, té, café y bebidas |
| Identidad visual | Bandera cubana (rojo, azul, blanco) + amarillo. Logo redondo en PNG con fondo transparente |

**Pendientes de validación** (los aporta el dueño):

- Precios reales.
- Horario completo por día.
- Fotos reales de los platos. No se usan las fotos de los afiches: son de stock y tienen licencia dudosa.
- Condiciones del 2x1 (días y horario).
- Contenido de «colaciones» y «desayunos».
- WhatsApp e Instagram.
- Place ID de Google, para el enlace directo a «escribir opinión».
- Traducciones al inglés.

---

## 2. Arquitectura

```text
Cliente (QR / Google / Maps / IG)
        │
        ▼
Vercel CDN ── caché ISR de «/» y «/en/» (on-demand + expiración 1 h)
        │  (solo si no está en caché)
        ▼
Función Astro (SSR, @astrojs/vercel 11)
   ├── Páginas públicas  → repositorios → Turso (libSQL/SQLite) vía Drizzle
   ├── /admin/*  (excluido de ISR, protegido por middleware)
   ├── Astro Actions (formularios del panel, validación con Zod)
   ├── /api/admin/upload → Vercel Blob (fotos WebP)
   ├── /api/evento       → contadores diarios (estadísticas)
   └── /qr               → suma un escaneo y redirige a «/»
```

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Astro 7, `output: 'server'` con ISR | Ya está en uso. La carta se sirve desde la caché como si fuera estática y se regenera al guardar en el panel. |
| Adaptador | `@astrojs/vercel` 11 con `isr: { bypassToken, expiration: 3600, exclude: [/^\/admin/, /^\/api\//, /^\/_actions\//, '/qr'] }` | Invalidación on-demand con un HEAD y la cabecera `x-prerender-revalidate`, verificado en la doc oficial. La expiración de 1 h actualiza el «menú del día» al cambiar de día. |
| Base de datos | Turso (libSQL) + `drizzle-orm` / `drizzle-kit` | SQLite sin servidor y plan gratuito. En local y en los tests se usa un archivo o `:memory:`, así que no hace falta Docker. Las consultas van parametrizadas. |
| Imágenes | Vercel Blob (`@vercel/blob`) detrás de una interfaz `AlmacenImagenes`; en dev y tests, un driver de disco local | El navegador comprime la foto antes de subirla (WebP de 480 y 1200 px), así que no hay procesamiento en el servidor. Las URLs son inmutables y se cachean para siempre. |
| Autenticación | Propia y mínima: hash `scrypt` (de `node:crypto`) en una variable de entorno y cookie de sesión firmada con HMAC (`HttpOnly`, `Secure`, `SameSite=Strict`, 7 días) | Cero dependencias. Hay un solo administrador, el dueño, y se puede ampliar más adelante. |
| QR | `uqr` (SVG, sin dependencias) apuntando a `https://www.donde-sino.com/qr` | **QR permanente:** si algún día cambia el destino, el QR impreso sigue sirviendo. Además cuenta los escaneos en el servidor. |
| Idiomas | i18n nativo de Astro: `es` por defecto sin prefijo y `en` en `/en/` | Campos `*_en` opcionales. Si un campo está vacío se muestra el texto en español. |
| JavaScript cliente | Vanilla TS, sin frameworks UI | Carta pública: menos de 5 KB de JS (abierto/cerrado, beacon de estadísticas). En el panel solo hay JS para comprimir fotos y para los toggles. |

**Patrón:** repositorios (`cartaRepo`, `negocioRepo`, `statsRepo`) sobre Drizzle. Las páginas y las acciones nunca tocan la base de datos directamente.

---

## 3. Modelo de datos (SQLite)

| Tabla | Campos clave |
|---|---|
| `negocio` (1 fila) | nombre, eslogan_es/en, descripcion_es/en, telefono, whatsapp, direccion, maps_url, resena_url, instagram, facebook, ubereats_url, rango_precio, servicios (JSON: wifi, pet_friendly, banos, para_llevar), horario (JSON por día con rangos que admiten cruzar la medianoche), lat/lng |
| `categoria` | id, slug, nombre_es/en, orden, visible |
| `producto` | id, categoria_id, nombre_es/en, descripcion_es/en, precio (entero CLP; si es nulo se muestra «Consultar»), imagen_sm/lg, ancho/alto, alt_es/en, alergenos (JSON), etiquetas (JSON: vegetariano, picante, nuevo), disponible (agotado), destacado, orden, visible, actualizado_en |
| `promocion` | id, titulo_es/en, descripcion_es/en, precio, imagen, activa, desde, hasta, orden |
| `menu_dia` | id, titulo_es/en, descripcion_es/en, precio, fecha (opcional), activo |
| `foto_destacada` | id, imagen, alt_es/en, orden (máximo 8, se valida en la acción) |
| `estadistica_diaria` | fecha, evento, conteo. PK (fecha, evento). Se incrementa con upsert. |
| `intento_login` | ip_hash, ventana, conteo (limita los intentos de login sin necesitar Redis) |

**Alérgenos:** lista fija de códigos (gluten, huevo, leche, soya, maní, frutos secos, pescado, mariscos, sulfitos). Se muestran como texto; el ícono es decorativo.

**Semilla inicial:** las categorías y productos de los afiches, sin precio, más la promo «Churrascos 2x1». Todo queda marcado como pendiente de revisión por el dueño.

---

## 4. Rutas

**Públicas** (en caché ISR):

- `/` y `/en/`: la carta, de arriba abajo:
  1. Logo, nombre, eslogan y estado abierto/cerrado. El estado se calcula en el cliente con la zona `America/Santiago`; sin JS se muestra el horario en texto.
  2. Barra de acciones: Cómo llegar · Llamar · Opinar en Google · Compartir (Web Share API, con copiar enlace como respaldo) · Uber Eats.
  3. Servicios: Wi-Fi, Pet Friendly, Baños, Para llevar.
  4. Promociones activas y menú del día.
  5. Fotos destacadas: carrusel con CSS scroll-snap, sin JS.
  6. Navegación de categorías: chips horizontales fijos con anclas.
  7. Secciones con sus productos: foto, nombre, descripción, precio, alérgenos y «Agotado».
  8. Pie con dirección, horario y redes.
- `/imprimir` y `/en/print`: versión papel/PDF (A4, `@media print`, compacta, con el QR al pie y botón «Imprimir / Guardar PDF»).
- `/robots.txt` (bloquea `/admin` y `/api`) y `/sitemap.xml` (`/`, `/en/`, `/imprimir`, `/en/print`, con `hreflang`).

**Sin caché:**

- `/qr`: suma `qr_escaneo` y responde con un 302 a `/`.
- `/api/evento`: beacon (`navigator.sendBeacon`). Solo acepta una lista cerrada de eventos (`visita`, `clic_llamar`, `clic_mapa`, `clic_resena`, `clic_ubereats`, `idioma_en`) y verifica el Origin. Ignora bots. No usa cookies ni guarda IPs.
- `/admin/login`.
- `/admin`: resumen de hoy y de los últimos 7 días (visitas, escaneos QR, clics) y accesos rápidos.
- `/admin/carta`: categorías y productos en lista. Precio editable en línea, toggle **Agotado** de un toque y orden con botones ↑↓ accesibles, sin drag & drop.
- `/admin/producto/[id]`: formulario completo. La foto se puede tomar con la cámara del celular y el alt se rellena con el nombre del producto.
- `/admin/promociones`, `/admin/menu-del-dia`, `/admin/fotos` y `/admin/local` (datos, horario, servicios y redes).
- `/admin/qr`: descarga del QR en SVG/PNG y tarjeta imprimible para las mesas.
- `/admin/estadisticas`: tabla y gráfico simple por día.

**Al guardar** cualquier cambio: escritura en BD → `revalidar()` (HEAD con el bypass token a `/`, `/en/`, `/imprimir` y `/en/print`) → aviso «Publicado».

---

## 5. Diseño

- **Dirección:** «picada de carretera moderna». Superficies crema/blancas y mucho aire. El logo redondo es el protagonista. Rojo para precios y acciones, azul profundo para títulos y una franja amarilla solo para promociones. Es una versión limpia de los afiches, no una copia.
- **Tokens** (`src/styles/tokens.css`): `--rojo #C8102E`, `--azul #0B2A6F`, `--amarillo #FFD100` (solo como fondo, con texto oscuro), `--tinta #1A1A1A`, `--crema #FFFBF0` y `--gris #595959`. Cada par texto/fondo se verifica en ≥4,5:1.
- **Tipografía:** fuentes del sistema (`system-ui`), sin descargas, por rendimiento. La marca la aporta el logo optimizado (WebP de unos 20 KB, precargado).
- **Layout:** una columna de hasta unos 40 rem. Desde 48 rem, los productos pasan a una grilla de 2 columnas. Tema claro solamente en el MVP.

---

## 6. Requisitos no funcionales

| Área | Criterio |
|---|---|
| Rendimiento | HTML + CSS + JS de la carta: 50 KB gzip o menos (sin imágenes). JS: 5 KB o menos. LCP < 1,5 s en 4G. Lighthouse móvil ≥ 95 en las 4 categorías. Imágenes con `width`/`height`, `srcset` y `lazy`, salvo la primera destacada. |
| Accesibilidad | WCAG 2.2 AA: skip link, landmarks, jerarquía h1 > h2 categorías > h3 productos, foco visible, objetivos táctiles de 44 px o más, `prefers-reduced-motion` y reflow a 320 px. «Agotado» y los alérgenos se dicen en texto. El panel tiene `label` y errores con `aria-describedby`. |
| SEO | `lang="es-CL"` y `hreflang`. JSON-LD de `Restaurant` con `hasMenu` → `MenuSection` → `MenuItem` (precio en CLP), dirección, teléfono, `openingHoursSpecification`, `servesCuisine` y `sameAs`. Además: meta description, OpenGraph con imagen 1200×630 y URL canónica. |
| Seguridad | `checkOrigin` de Astro (CSRF) y login limitado por BD. Las subidas se validan por *magic bytes*, con un máximo de 1,5 MB y nombres aleatorios. El JSON-LD se serializa escapando `<`. Cabeceras en el middleware (`src/middleware.ts`, y no en `vercel.json`, para poder cubrirlas con E2E): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y una CSP acotada (`frame-ancestors 'none'`, `base-uri`, `object-src` y `form-action`). La CSP completa que restrinja scripts e imágenes queda pendiente de verificar contra el build real. Las subidas, además, se firman con HMAC y se validan chunk por chunk. El panel lleva `noindex`. Los secretos solo viven en variables de entorno. |

**Variables de entorno** (con `.env.example` versionado): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` e `ISR_BYPASS_TOKEN`. La URL pública del sitio se define en `site`, dentro de `astro.config.mjs`. El script `npm run admin:hash` (Fase 2) generará el hash de la contraseña.

---

## 7. Fases

Cada fase termina con `npx astro check`, `npm run build` y tests en verde, y con la documentación AI-DLC actualizada.

### Fase 0: Fundaciones ✅ (2026-10-23)

> **Resultado:**
> - `check`, `build` y 40 tests en verde, con ≈99 % de cobertura. Revisiones de código y de seguridad aplicadas (ver `NOTAS_REVISION_CODIGO.md`).
> - `uqr`, Playwright y axe se instalarán cuando se usen (Fases 1 y 3), no antes.
> - La promo 2x1 queda inactiva hasta que el dueño confirme sus condiciones.

- **Corregir la documentación AI-DLC** al propósito real: INTENCION, REQUISITOS, PARTES_INTERESADAS, HISTORIAS_USUARIO, CRITERIOS_ACEPTACION, MODELO_DOMINIO, ARQUITECTURA, README, MANIFIESTO y HOJA_RUTA.
- **Nuevos ADR:** DEC-003 (propósito: carta digital del local) y DEC-004 (SSR + ISR, Turso + Drizzle, Vercel Blob, autenticación propia).
- **Dependencias y configuración:** `@astrojs/vercel`, `drizzle-orm`, `@libsql/client`, `drizzle-kit`, `@vercel/blob`, `uqr`, `vitest`, `@playwright/test` y `@axe-core/playwright`, más `astro.config.mjs` con ISR e i18n.
- **Datos:** esquema Drizzle, migraciones y semilla.
- **Infraestructura de código:** driver de almacenamiento local/Blob, tokens CSS y logo optimizado en `src/assets/`.

### Fase 1: Carta pública (ES/EN)

- Componentes en `src/components/carta/`: `EncabezadoLocal`, `BarraAcciones`, `Servicios`, `Promociones`, `MenuDelDia`, `GaleriaDestacados`, `NavCategorias`, `SeccionCategoria`, `TarjetaProducto`, `Alergenos` y `PieLocal`.
- Utilidades en `src/lib/`: `precio.ts` (formato CLP), `horario.ts` (abierto/cerrado, cruce de medianoche), `jsonld.ts` e `i18n/`.
- Versión imprimible, robots, sitemap y OpenGraph.
- **Verificación:**
  - JSON-LD validado con el Rich Results Test.
  - axe sin violaciones.
  - Capturas a 320, 375, 768, 1024 y 1440 px.
  - Presupuesto de bytes medido.

### Fase 2: Panel de administración

- Middleware de sesión, login con límite de intentos y `src/lib/auth/` (`password.ts`, `sesion.ts`).
- Astro Actions con Zod para todo el CRUD.
- Subida de fotos con compresión en el cliente.
- Toggle «Agotado» y reordenar.
- `revalidar.ts`.
- **Verificación (E2E):** login → cambiar un precio → se ve en `/` sin desplegar. También: marcar agotado, subir una foto y que el login rechace credenciales malas.

### Fase 3: QR y estadísticas

- `/qr` con su contador y `/api/evento` con el beacon.
- Panel de estadísticas.
- `/admin/qr`: descarga SVG/PNG y tarjeta de mesa imprimible.

### Fase 4: Calidad y lanzamiento

- Cobertura ≥ 80 %:
  - Unitarias: horario, precio, JSON-LD, Zod, auth, i18n, validación de eventos.
  - Integración con libSQL `:memory:`: repositorios, acciones, `/qr`, `/api/evento`.
  - E2E con Playwright, flujos críticos.
- Revisión con los agentes `security-reviewer` y `code-reviewer`. Lighthouse en el preview de Vercel.
- **Puesta en marcha en Vercel:**
  - Crear la BD en Turso y el store de Blob.
  - Cargar las variables de entorno.
  - Correr las migraciones y la semilla.
  - Desplegar el preview y luego producción.
- **Tareas del dueño:**
  - Cargar precios y fotos.
  - Agregar `donde-sino.com` como sitio web y enlace de menú en su ficha de Google.
  - Imprimir los QR para las mesas.

---

## 8. Riesgos y notas

- **Plan Hobby de Vercel:** sus términos lo limitan a uso no comercial. Para un negocio corresponde Pro (US$20/mes). **El responsable eligió Hobby (2026-10-24)** asumiendo el riesgo; se pasa a Pro si Vercel lo pide.
- **Carta sin precios:** hasta que el dueño los cargue, los productos muestran «Consultar». Conviene cargar los precios antes de imprimir el QR.
- **Inglés:** si nadie traduce, la versión `/en/` muestra el contenido en español con la interfaz en inglés. Es aceptable, pero se pierde valor.
- **Estadísticas aproximadas:** son contadores propios sin cookies, no analítica de precisión. Las métricas por plato («qué platos miran más») quedan para una fase posterior.
- **`npm audit`:** reporta 9 vulnerabilidades en las dependencias actuales. Se revisan en la Fase 0 al actualizar Astro (hay una 7.4.2 disponible).
