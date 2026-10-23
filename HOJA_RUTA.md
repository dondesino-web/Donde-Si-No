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

## 2. Siguiente

- [ ] **Fase 1 · Carta pública (ES/EN):**
  - Carta con promociones, menú del día, fotos, alérgenos y estado agotado.
  - Versión imprimible, JSON-LD, sitemap y OpenGraph.
  - Playwright + axe.
- [ ] **Fase 2 · Panel de administración:** login seguro, CRUD, subida de fotos, toggle de agotado y revalidación instantánea.
- [ ] **Fase 3 · QR y estadísticas:** `/qr` permanente, beacon sin cookies, panel de estadísticas y tarjeta de mesa.
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
