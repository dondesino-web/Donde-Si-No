# Lista de Verificación de Despliegue

## Definición del documento

- **Para qué sirve:** guía el proceso de paso a producción asegurando que no se omitan pasos críticos de seguridad, build o configuración.
- **Cuándo se crea o actualiza:** en fases de Construcción Tardía / Operaciones y antes de cada release productiva.
- **Qué debe contener:** lista de comprobación de build, secretos, pruebas, optimizaciones y reversión.

---

## 1. Estado de Despliegue

- **Fase actual:** Construcción. Fase 0 (fundaciones) terminada; la carta digital aún no está publicada.
- **Producción:** [https://www.donde-sino.com/](https://www.donde-sino.com/), en Vercel, con CI/CD automático desde `main`.

---

## 2. Checklist de Verificación de Producción

- [x] **Dominio y certificado SSL** en `https://www.donde-sino.com/`.
- [x] **Compilación:** `npm run build` genera `.vercel/output/` sin errores.
- [x] **CI/CD:** Vercel integrado con GitHub.
- [x] **Plan de reversión:** Instant Rollback de Vercel.
- [x] **Tipado estricto:** `npm run check` sin errores.
- [x] **Sin secretos en el repositorio:** `.env*` ignorados salvo `.env.example`; los secretos se leen con `astro:env`.
- [x] **Tests:** `npm run test:coverage` en verde con ≥ 80 %.
- [ ] **Plan de Vercel** adecuado para uso comercial (Pro).
- [ ] **Turso:** base creada, migraciones aplicadas y semilla cargada.
- [ ] **Vercel Blob:** store creado y `BLOB_READ_WRITE_TOKEN` configurado.
- [ ] **Secretos de la Fase 2:** `ISR_BYPASS_TOKEN` (≥ 32 caracteres), `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.
- [ ] **Lighthouse en producción:** ≥ 95 en Performance, Accesibilidad, Buenas prácticas y SEO.
- [ ] **Revisión de `.vercel/output/config.json`:** solo la carta pública pasa por `_isr`.
- [ ] **Ficha de Google:** enlazar `www.donde-sino.com` como sitio web y como menú.
