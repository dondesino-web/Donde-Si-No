# Hoja de Ruta (ROADMAP.md)

## Definición del documento

- **Para qué sirve:** comunica la dirección estratégica, hitos planificados, prioridades y estado de progreso del proyecto.
- **Cuándo se crea o actualiza:** en cada ciclo de planificación estratégica o tras completar un hito importante.
- **Qué debe contener:** horizontes temporales / fases (Corto, Medio, Largo plazo), objetivos, estado y riesgos.

---

Detalle de cada fase en [`PLAN_CARTA_DIGITAL.md`](./documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md).

## 1. Hecho

- [x] **Formalización documental:** estándar AI-DLC y directrices del repositorio (2026-08-26).
- [x] **Validación de negocio:** el proyecto es la carta digital QR del local «Dónde Si No» (DEC-003, 2026-10-22).
- [x] **Fase 0 · Fundaciones** (2026-10-23):
  - Astro 7.4 con Vercel + ISR, i18n y `astro:env`.
  - Esquema Turso/Drizzle con migración, semilla con los datos del local y almacén de imágenes.
  - Tokens de diseño accesibles, íconos de marca y suite de tests (40 tests, ≈99 % de cobertura).

- [x] **Fase 1 · Carta pública (ES/EN)** (2026-10-23):
  - Carta con promociones, menú del día, fotos, alérgenos y estado agotado, en `/` y `/en/`.
  - Versión imprimible, JSON-LD (`Restaurant` + `Menu`), sitemap, `robots.txt`, `hreflang` y OpenGraph.
  - Estado «Abierto ahora» calculado en el navegador con la hora de Chile (la página se cachea 1 h).
  - Playwright + axe: WCAG 2.2 AA sin violaciones y sin desborde horizontal de 320 a 1440 px.
- [x] **Fase 2 · Panel de administración** (2026-10-23):
  - Login con scrypt, sesión firmada de 7 días y límite de intentos atómico por IP; el panel queda desactivado sin configuración.
  - Carta: precio en línea, **Agotado** de un toque, orden con ↑↓, productos y categorías (CRUD completo).
  - Promociones con vigencia (desde/hasta) y menú del día único, con el estado explicado en el panel.
  - Datos del local: horario de hasta dos tramos por día, servicios, redes y contacto; enlaces solo `https` y de hosts exactos.
  - Fotos en productos y promociones, y galería de hasta 8 destacadas: el navegador las reduce a WebP, el servidor las valida por bytes y las firma, y los archivos huérfanos se borran.
  - Cada cambio refresca la carta pública (revalidación ISR) y avisa si no pudo.
  - Cabeceras de seguridad en todas las respuestas y cuatro revisiones de seguridad aplicadas.
  - 364 tests unitarios y de integración, y 85 E2E estables.

- [x] **Fase 3 · QR y estadísticas** (2026-10-23):
  - `/qr` cuenta el escaneo y redirige a la carta; el QR impreso apunta siempre ahí, así que es permanente.
  - Beacon `/api/evento` sin cookies ni IPs, con una lista cerrada de eventos, verificación de origen y tope de tamaño. No cuenta robots, previsualizaciones ni al administrador con sesión.
  - Panel: resumen de hoy y de la semana en el inicio, `/admin/estadisticas` (7, 14 o 30 días, gráfico accesible y tabla) y `/admin/qr` con descarga en SVG y PNG y tarjeta de mesa imprimible (1 o 4 por hoja, en español e inglés).
  - 446 tests unitarios y de integración, y 108 E2E.

- [x] **Fase 4 · Calidad y lanzamiento** (2026-10-24):
  - Cobertura de `src/lib` al 98 %, CI en GitHub Actions (en verde en el PR #1), revisión final de seguridad y de calidad de código, Lighthouse 100/100/100/100 en un build empaquetado local, presupuesto de bytes medido (HTML ≈ 6 KB, CSS ≈ 1,7 KB y JS ≈ 1,1 KB gzip), cron diario de limpieza de fotos y `npm run entorno:verificar`.
  - **Publicada en `https://www.donde-sino.com`:** Turso y Vercel Blob creados, variables cargadas y verificadas, PR #1 fusionado a `main`. El repositorio pasó a la cuenta del negocio (`dondesino-web`), el proyecto de Vercel quedó en el equipo `donde-sino` y el dominio se trasladó a ese equipo. Detalle en [la guía de despliegue](./documentacion-aidlc/despliegue/LISTA_VERIFICACION_DESPLIEGUE.md).

## 2. Siguiente

- [ ] **Tareas del dueño:** cargar precios, fotos, horario y redes; enlazar la carta en su ficha de Google; imprimir los QR para las mesas.
- [ ] **Cierre pendiente de las Fases 1 a 4** (en producción):
  - **Límite de tasa** en Vercel Firewall sobre `/qr` y `/api/evento` (por ejemplo 30 por minuto por IP): sin cookies ni IPs en la aplicación, es la única defensa real contra quien infle las cifras o gaste escrituras de Turso.
  - Probar el QR impreso en el tamaño final con varios celulares.
  - Probar en producción la revalidación ISR, Vercel Blob y el login detrás del proxy (`x-forwarded-for`), y ver el cron en *Settings → Cron Jobs*.
  - Lighthouse en producción con fotos reales.
  - Darle a Preview una base de Turso y un store de Blob propios (hoy comparte los de producción).
  - Validar el JSON-LD con el Rich Results Test (necesita la URL pública).
  - CSP completa que restrinja scripts e imágenes (hoy es una CSP acotada): probarla en modo solo-reporte en el *preview*.
  - Regla de límite de tasa en Vercel Firewall también para `/admin/login`.
  - Probar la subida de fotos en Safari de iPhone (puede no escribir WebP).

## 3. Más adelante (fuera del MVP)

- [ ] Estadísticas por plato («qué platos se miran más»).
- [ ] Pedido por WhatsApp (descartado para el MVP por el responsable).
- [ ] Más de una cuenta de administrador.
- [ ] Extraer componentes del panel (avisos, botones ↑/↓, confirmación) y unificar las acciones «mover»: ver la deuda técnica en [NOTAS_REVISION_CODIGO.md](./documentacion-aidlc/generacion-codigo/NOTAS_REVISION_CODIGO.md).

---

## Riesgos

- ⚠️ El responsable eligió el plan Hobby de Vercel (2026-10-24), cuyos términos excluyen el uso comercial: Vercel podría limitar o suspender el proyecto. Pasar a Pro si lo pide o cuando el negocio dependa de la carta.
- ⚠️ La carta se lanza sin precios («Consultar») si el dueño no los carga antes de imprimir el QR.
- ⚠️ El horario del local está vacío en la semilla: la carta dice «Horario por confirmar» hasta que el dueño lo cargue en `/admin/local`.
- ⚠️ Los *previews* de Vercel usan la misma base y el mismo store que producción: lo que se edite en un *preview* cambia la carta publicada.
- ⚠️ El dominio se renueva en AWS (Amazon Registrar), no en Vercel, y vence el 2027-03-10.
