# Manifiesto del Proyecto

## Definición del documento

- **Para qué sirve:** resume en una sola página la identidad, propósito, stack tecnológico, comandos esenciales y enlaces clave del proyecto.
- **Cuándo se crea o actualiza:** al iniciar el proyecto y cada vez que cambien comandos, variables clave o dependencias mayores.
- **Qué debe contener:** ficha técnica del repositorio, comandos de desarrollo y build, variables y enlaces directos.

---

## 1. Ficha Técnica

- **Nombre del Proyecto:** Donde-Si-No (`dondesino`)
- **Propósito:** carta digital en código QR del local de comida rápida «Dónde Si No» (Chocalán, Melipilla), con panel de administración para el dueño. Ver [DEC-003](./documentacion-aidlc/diseno/DECISIONES/DEC-003-proposito-carta-digital.md).
- **Propietario / Mantenedor:** `jhonabruzzi278`
- **URL de Producción:** [https://www.donde-sino.com/](https://www.donde-sino.com/)
- **Proveedor de Hosting:** Vercel (CI/CD automático desde GitHub)
- **Fase AI-DLC:** Operaciones · carta publicada el 2026-10-24 (Fases 0 a 4 del plan terminadas)
- **Repositorio:** `https://github.com/dondesino-web/Donde-Si-No.git`
- **Stack:** Astro 7 (`output: 'server'`, ISR) · `@astrojs/vercel` 11 · Turso + Drizzle · Vercel Blob · Vitest
- **Runtime:** Node.js ≥ 22.23.4
- **Última Actualización:** 2026-10-23

---

## 2. Comandos Esenciales

| Comando | Propósito |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run db:migrate && npm run db:seed` | Crear la base local (`local.db`) y cargar los datos iniciales |
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run check` | Verificar tipos |
| `npm test` / `npm run test:coverage` | Pruebas (umbral del 80 %) |
| `npm run build` | Build de producción para Vercel |

---

## 3. Variables de Entorno

Plantilla en [`.env.example`](./.env.example):

- **Fase 0:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `BLOB_READ_WRITE_TOKEN`.
- **Fase 2:** `ISR_BYPASS_TOKEN`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`.

Detalle en [INFRAESTRUCTURA_COMO_CODIGO.md](./documentacion-aidlc/despliegue/INFRAESTRUCTURA_COMO_CODIGO.md).

---

## 4. Enlaces Rápidos de Documentación

- **Plan de la carta digital:** [`documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md`](./documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md)
- **Metadatos AI-DLC:** [`documentacion-aidlc/00_METADATOS_PROYECTO.md`](./documentacion-aidlc/00_METADATOS_PROYECTO.md)
- **Despliegue e Infraestructura:** [`documentacion-aidlc/despliegue/INFRAESTRUCTURA_COMO_CODIGO.md`](./documentacion-aidlc/despliegue/INFRAESTRUCTURA_COMO_CODIGO.md)
- **Requisitos del Sistema:** [`documentacion-aidlc/requisitos/REQUISITOS.md`](./documentacion-aidlc/requisitos/REQUISITOS.md)
- **Arquitectura y Diseño:** [`documentacion-aidlc/diseno/ARQUITECTURA.md`](./documentacion-aidlc/diseno/ARQUITECTURA.md)
- **Reglas para Agentes:** [`INSTRUCCIONES_AGENTE.md`](./INSTRUCCIONES_AGENTE.md)
- **Guía de Contribución:** [`CONTRIBUIR.md`](./CONTRIBUIR.md)
- **Registro de Cambios:** [`REGISTRO_CAMBIOS.md`](./REGISTRO_CAMBIOS.md)
