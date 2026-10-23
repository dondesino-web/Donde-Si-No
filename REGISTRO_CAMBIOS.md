# Registro de Cambios (CHANGELOG.md)

## Definición del documento

- **Para qué sirve:** lleva el registro histórico ordenado y verificable de modificaciones, adiciones, correcciones y versiones del proyecto.
- **Cuándo se crea o actualiza:** en cada release, hito o entrega de valor funcional o estructural.
- **Qué debe contener:** versiones, fechas, categorías estándar (Añadido, Modificado, Corregido, Seguridad) y enlaces a decisiones o PRs.

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
