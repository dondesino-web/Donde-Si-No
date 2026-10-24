# Registro de Prompts e Instrucciones de IA

## Definición del documento

- **Para qué sirve:** conserva la trazabilidad de instrucciones maestras, prompts y directrices de IA utilizadas en el proyecto.
- **Cuándo se crea o actualiza:** después de cada análisis, auditoría o generación relevante asistida por IA.
- **Qué debe contener:** fecha, propósito, resumen de la sesión, fase, artefactos afectados y estado de validación humana.

---

## 1. Registro de Sesiones

### Sesión 01: Inicialización y Auditoría AI-DLC
- **Fecha:** 2026-08-26
- **Propósito:** Análisis del repositorio `Donde-Si-No` según la directriz `AI_DLC_KICKOFF_PROMPT.md`, detección de fase y creación completa de la estructura documental AI-DLC y estándares del repositorio.
- **Fase AI-DLC:** Iniciación / Scaffolding inicial.
- **Artefactos Generados / Actualizados:**
  - Estructura completa `/documentacion-aidlc/`.
  - Documentos de colaboración raíz: `INSTRUCCIONES_AGENTE.md`, `CONTRIBUIR.md`, `REGISTRO_CAMBIOS.md`, `HOJA_RUTA.md`, `SEGURIDAD.md`, `ESTANDAR_PROYECTO.md`, `MANIFIESTO_PROYECTO.md`.
  - Actualización de `README.md`.
- **Validación Humana:** Validado por el usuario con provisión de URL productiva en Vercel.

### Sesión 02: Incorporación de Producción y Hosting (Vercel)
- **Fecha:** 2026-08-26
- **Propósito:** Registrar formalmente el despliegue activo en Vercel con el dominio personalizado `https://www.donde-sino.com/`. Reclasificación de fase a **Construcción Tardía / Despliegue Activo**.
- **Artefactos Afectados:**
  - `documentacion-aidlc/00_METADATOS_PROYECTO.md`
  - `documentacion-aidlc/despliegue/INFRAESTRUCTURA_COMO_CODIGO.md`
  - `documentacion-aidlc/despliegue/LISTA_VERIFICACION_DESPLIEGUE.md`
  - `MANIFIESTO_PROYECTO.md`
  - `README.md`
- **Validación Humana:** ✅ Confirmado por `jhonabruzzi278` y verificado vía petición HTTP en vivo.

### Sesión 03: Carta digital QR — plan y Fase 0 (fundaciones)
- **Fecha:** 2026-10-22 / 2026-10-23
- **Agente:** Claude Code (Claude Opus 5.5)
- **Propósito:**
  - Levantar el proyecto en local.
  - Planificar la carta digital QR del local «Dónde Si No», a partir de los afiches, la ficha de Google y la referencia QrCarta que compartió el usuario.
  - Ejecutar la Fase 0.
- **Prompts clave del usuario:**
  1. «levantame este proyecto en local»
  2. Pedido de una carta QR sencilla, genérica, minimalista, mobile first, responsiva, accesible y ultrarrápida, con un panel de administración sencillo para precios e imágenes, inspirada en QrCarta, con «planifica».
  3. «Aprobado el plan. Empieza con la Fase 0.»
- **Decisiones del usuario:**
  - Panel propio con base de datos.
  - Seguir en Vercel.
  - MVP con estadísticas, versión imprimible e inglés.
- **Fase AI-DLC:** Iniciación (corrección de propósito) → Construcción (Fase 0).
- **Artefactos generados o actualizados:**
  - `documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md`, DEC-003 y DEC-004.
  - Reescritura de requisitos, historias, criterios, modelo de dominio, diseño lógico, arquitectura, pruebas y despliegue.
  - Código de la Fase 0: ver [`REGISTRO_CODIGO_GENERADO.md`](./generacion-codigo/REGISTRO_CODIGO_GENERADO.md).
  - Revisión de código y de seguridad por subagentes: ver [`NOTAS_REVISION_CODIGO.md`](./generacion-codigo/NOTAS_REVISION_CODIGO.md).
- **Validación Humana:** ✅ Plan aprobado por `jhonabruzzi278`. ⚠️ Código de la Fase 0 pendiente de revisión (sin commit).
