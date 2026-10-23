# Registro de Cambios (CHANGELOG.md)

## Definición del documento

- **Para qué sirve:** lleva el registro histórico ordenado y verificable de modificaciones, adiciones, correcciones y versiones del proyecto.
- **Cuándo se crea o actualiza:** en cada release, hito o entrega de valor funcional o estructural.
- **Qué debe contener:** versiones, fechas, categorías estándar (Añadido, Modificado, Corregido, Seguridad) y enlaces a decisiones o PRs.

---

## [Sin Versión / En Desarrollo] - 2026-10-23 · Fase 3 de la carta digital: QR y estadísticas

### Añadido
- **QR permanente** (`/qr`): cuenta el escaneo y redirige a la carta con un 302 sin caché. El QR impreso apunta siempre a esta dirección, así que si algún día cambia el destino no hay que reimprimir.
- **Estadísticas sin cookies** (`/api/evento`, `src/scripts/estadisticas.ts`): la carta avisa visitas, clics en llamar, mapa, reseña, Uber Eats y compartir, y el cambio a inglés. Solo se guarda un contador por día y evento: ni IPs ni identificadores.
  - Lista cerrada de eventos; los escaneos del QR solo los suma `/qr`.
  - Verificación de origen, tope de 256 bytes leído con límite real y respuesta 204.
  - No cuenta robots (incluidos Playwright, Puppeteer y Selenium), previsualizaciones de enlaces, precargas ni al administrador con sesión.
- **Panel:** resumen de hoy y de los últimos 7 días en el inicio; `/admin/estadisticas` con periodos de 7, 14 y 30 días, un gráfico accesible y la tabla por día (en hora de Chile).
- **Código QR** (`/admin/qr`): vista previa, descarga en SVG y en PNG de 1200 px (generado en el navegador) y tarjeta de mesa imprimible, de una o cuatro por hoja, en español e inglés (`src/lib/qr.ts`, con `uqr`; exige `https`).
- **Pruebas:** 446 tests unitarios y de integración y 108 E2E (QR, beacon, bots, origen, sesión, descargas, tarjeta, WCAG 2.2 AA).

### Modificado
- La conexión a SQLite local usa el modo WAL y espera su turno ante bloqueos: en el modo por defecto una lectura que pasa a escritura falla al instante con `SQLITE_BUSY`, aunque haya tiempo de espera configurado.
- Los E2E calientan el servidor de desarrollo antes de empezar (con la caché vacía las pruebas en paralelo se atascaban juntas), corren con 4 trabajadores, esperas de 10 s y un reintento que Playwright informa como «flaky».
- Los títulos del panel tienen más espacio respecto del texto anterior.

### Seguridad
- Revisión de la Fase 3 sin hallazgos críticos ni altos. Aplicado: lectura del cuerpo con tope real (también sin `Content-Length`), y tests de HEAD y de los cambios de horario de Chile.
- Pendiente (infraestructura): límite de tasa en Vercel Firewall sobre `/qr` y `/api/evento`. Sin cookies ni IPs, la aplicación no puede impedir que alguien infle las cifras falsificando cabeceras. Anotado en [HOJA_RUTA.md](./HOJA_RUTA.md).

---

## [Sin Versión / En Desarrollo] - 2026-10-23 · Fase 2 de la carta digital: panel de administración

### Añadido
- **Autenticación** (`src/lib/auth/`, `src/middleware.ts`):
  - Contraseña con scrypt, sesión sin estado firmada con HMAC (7 días, cookie `HttpOnly` y `SameSite=Strict`) y límite de 5 intentos por 15 minutos por IP, guardada solo como HMAC.
  - Login, cierre de sesión y `npm run admin:hash` para generar el hash y el secreto. Sin `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` el panel no se puede abrir.
- **Carta** (`/admin/carta`, `/admin/producto/*`): precio en línea, «Agotado» de un toque con estado explícito, orden con ↑↓ y CRUD de productos y categorías, con formularios que conservan lo escrito.
- **Promociones y menú del día** (`/admin/promociones`, `/admin/menu-del-dia`): vigencia por fechas con el estado explicado (vigente, programada, vencida, apagada) y menú único a prueba de guardados simultáneos.
- **Datos del local** (`/admin/local`): horario de hasta dos tramos por día (con cierre pasada la medianoche), servicios, redes, contacto y coordenadas. El teléfono se normaliza a formato internacional.
- **Fotos** (`/admin/fotos`, `/api/admin/upload`):
  - Foto en productos y promociones, y galería de hasta 8 fotos destacadas.
  - El navegador reduce la foto a WebP (480 y 1200 px); el servidor la valida por sus bytes (firma, estructura de chunks, dimensiones, peso y proporción) y firma la respuesta.
  - Al reemplazar, quitar o eliminar se borran los archivos huérfanos, salvo los que otro registro aún usa.
- **Revalidación** (`src/lib/revalidar.ts`): cada cambio refresca las cuatro páginas públicas sin seguir redirecciones y con tiempo máximo; si falla, el cambio queda guardado y se avisa.
- **Cabeceras de seguridad** en todas las respuestas: `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y una CSP acotada (`frame-ancestors`, `base-uri`, `object-src`, `form-action`).
- **Pruebas:** 364 tests unitarios y de integración y 85 E2E con Playwright y axe, que incluyen rutas disfrazadas contra el login, acciones sin sesión, cookie falsificada, subidas de fotos reales y WCAG 2.2 AA en las pantallas del panel.

### Modificado
- La carta pública descarta cualquier enlace que no sea `https` aunque esté en la base, y respeta los saltos de línea del detalle del menú y de las promociones.
- Las fotos del modo local se sirven desde `/uploads/[clave]` (carpeta `.uploads/`, fuera de `public/`) para que Vite no recargue las páginas al subir.
- La conexión local a SQLite espera su turno ante bloqueos (`abrirBd`) en lugar de fallar con `SQLITE_BUSY`.
- La barra flotante de desarrollo de Astro queda desactivada: tapaba botones al pie de página.

### Corregido
- El login se podía esquivar con rutas codificadas (`/%61dmin`): ahora la ruta se decodifica antes de decidir el acceso y el middleware no tiene prefiltro.
- El límite de intentos se evadía con peticiones simultáneas: el intento se reserva de forma atómica antes de verificar la contraseña.
- El texto de un formulario con errores se recortaba al reabrirlo.
- Los errores de coordenadas salían en una segunda ronda, después de corregir los demás campos.

### Seguridad
- Cinco revisiones de seguridad (login, CRUD, promociones y menú, datos del local y subida de fotos) sin hallazgos críticos; los de severidad alta y media se corrigieron.
- Los enlaces del local solo se aceptan `https`, sin usuario, clave ni puerto, y de hosts exactos (Google solo bajo `/maps` y `/local`; sin acortadores ni subdominios de contenido abierto).
- Las subidas de fotos se firman con HMAC: nadie puede guardar una URL inventada ni reasignar la foto de otro registro. El almacén de Vercel Blob solo reconoce el store propio.
- Pendiente anotado en [HOJA_RUTA.md](./HOJA_RUTA.md): CSP completa, limpieza de fotos huérfanas y pruebas contra Vercel real.

---

## [Sin Versión / En Desarrollo] - 2026-10-23 · Fase 1 de la carta digital: carta pública

### Añadido
- Carta pública en español (`/`) e inglés (`/en/`) con encabezado, acciones rápidas (llamar, cómo llegar, compartir), promociones, menú del día, galería, navegación fija por categorías, productos con alérgenos, etiquetas y estado agotado, y pie con horario, contacto y servicios.
- Versión imprimible (`/imprimir`, `/en/print`).
- SEO: JSON-LD `Restaurant` con `Menu`, `hreflang`, OpenGraph, `robots.txt` y `sitemap.xml` con ambos idiomas.
- Estado «Abierto ahora» calculado en el navegador con la hora de Chile, porque la página se cachea una hora.
- Utilidades de dominio: formato de precio en CLP, teléfono, horario (con cierre pasada la medianoche) e i18n con respaldo al español.
- Pruebas E2E con Playwright y axe: WCAG 2.2 AA y sin desborde horizontal a 320, 375, 768, 1024 y 1440 px.

### Seguridad
- El JSON-LD escapa `<`, `>`, `&` y los separadores de línea U+2028/U+2029 para que el contenido no pueda cerrar la etiqueta `<script>`.

---

## [Sin Versión / En Desarrollo] - 2026-10-23 · Fase 0 de la carta digital

### Añadido
- Plan aprobado de la carta digital QR ([PLAN_CARTA_DIGITAL.md](./documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md)) y decisiones [DEC-003](./documentacion-aidlc/diseno/DECISIONES/DEC-003-proposito-carta-digital.md) (propósito) y [DEC-004](./documentacion-aidlc/diseno/DECISIONES/DEC-004-arquitectura-ssr-isr-turso-blob.md) (arquitectura).
- Adaptador `@astrojs/vercel` con ISR (expiración de 1 h, invalidación on-demand, exclusiones para el panel y la API), i18n `es`/`en` y variables validadas con `astro:env`.
- Base de datos Turso/libSQL con Drizzle:
  - Esquema con restricciones `CHECK` y migración inicial (`drizzle/0000_inicial.sql`).
  - Semilla idempotente con los datos del local extraídos de Google y de los afiches.
- Almacén de imágenes con Vercel Blob en producción y disco local en desarrollo, protegido contra path traversal y borrados ajenos.
- Tokens de diseño con contraste WCAG verificado, CSS base accesible, logo optimizado, `favicon.ico` y `apple-touch-icon`.
- Vitest con cobertura (40 tests, ≈99 %) y scripts `check`, `test`, `db:*` y `marca:iconos`.

### Modificado
- Astro actualizado de 7.2.7 a 7.4.2; Node.js mínimo 22.23.4.
- Documentación AI-DLC reescrita al propósito real: intención, requisitos, partes interesadas, historias, criterios, modelo de dominio, diseño, arquitectura, pruebas y despliegue.
- La portada provisional muestra la marca del local en lugar de la plantilla de Astro.

### Eliminado
- Script `preview`: el adaptador de Vercel no lo soporta.
- `public/favicon.svg` de la plantilla de Astro.

### Seguridad
- `npm audit fix` actualizó `sharp` a 0.35.5.
- Avisos restantes aceptados y documentados en [NOTAS_REVISION_CODIGO.md](./documentacion-aidlc/generacion-codigo/NOTAS_REVISION_CODIGO.md): `path-to-regexp` (solo en build) y `esbuild` (solo en dev).

---

## [Sin Versión] - 2026-08-26

### Añadido
- Adopción e inicialización formal de la metodología **AI-DLC** en el repositorio.
- Estructura completa de documentación viva en `/documentacion-aidlc/` (`00_METADATOS_PROYECTO.md`, requisitos, historias, diseño lógico y modelo de dominio, estrategia de pruebas y operaciones).
- Documentos de colaboración y gobernanza técnica: `ESTANDAR_PROYECTO.md`, `INSTRUCCIONES_AGENTE.md`, `CONTRIBUIR.md`, `MANIFIESTO_PROYECTO.md`, `HOJA_RUTA.md` y `SEGURIDAD.md`.
- Registro de Decisiones de Arquitectura: [DEC-001](./documentacion-aidlc/diseno/DECISIONES/DEC-001-adopcion-framework-astro.md) y [DEC-002](./documentacion-aidlc/diseno/DECISIONES/DEC-002-adopcion-metodologia-aidlc.md).

### Modificado
- Actualizado `README.md` con enlaces directos a la documentación AI-DLC y resumen técnico.

---

## [0.0.1] - 2025-09-23
- Scaffolding inicial generado con plantilla `Astro Minimal` (`astro create`).
