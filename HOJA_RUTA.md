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

## 2. Siguiente

- [ ] **Cierre pendiente de las Fases 1 a 3** (se hará con el despliegue de la Fase 4):
  - **Límite de tasa** en Vercel Firewall sobre `/qr` y `/api/evento` (por ejemplo 30 por minuto por IP): sin cookies ni IPs en la aplicación, es la única defensa real contra quien infle las cifras o gaste escrituras de Turso.
  - Probar el QR impreso en el tamaño final con varios celulares.
  - Probar contra Vercel real la revalidación ISR, Vercel Blob y el login detrás del proxy (`x-forwarded-for`).
  - Medir el presupuesto de bytes y validar el JSON-LD con el Rich Results Test.
  - CSP completa que restrinja scripts e imágenes (hoy es una CSP acotada).
  - Limpieza periódica de fotos subidas y nunca guardadas.
  - Probar la subida de fotos en Safari de iPhone (puede no escribir WebP).
- [ ] **Fase 4 · Calidad y lanzamiento:**
  - Cobertura ≥ 80 %, revisiones de seguridad y Lighthouse ≥ 95.
  - CI en GitHub Actions.
  - Turso y Blob en producción.

## 3. Más adelante (fuera del MVP)

- [ ] Estadísticas por plato («qué platos se miran más»).
- [ ] Pedido por WhatsApp (descartado para el MVP por el responsable).
- [ ] Más de una cuenta de administrador.

---

## Riesgos

- ⚠️ El plan Hobby de Vercel es solo para uso no comercial: evaluar Pro antes del lanzamiento.
- ⚠️ La carta se lanza sin precios («Consultar») si el dueño no los carga antes de imprimir el QR.
- ⚠️ El horario del local está vacío en la semilla: la carta dice «Horario por confirmar» hasta que el dueño lo cargue en `/admin/local`.
- ⚠️ La contraseña del panel (`npm run admin:hash`), `SESSION_SECRET`, `ISR_BYPASS_TOKEN` y el store de Blob deben cargarse en Vercel antes de usar el panel en producción.
