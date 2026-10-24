# Estándar del Proyecto (PROJECT_STANDARD.md)

## Definición del documento

- **Para qué sirve:** unifica las reglas arquitectónicas, convenciones de código, estilos, pruebas, ramas y gobernanza para desarrolladores y agentes de IA.
- **Cuándo se crea o actualiza:** en la fase de Iniciación y cada vez que el equipo refine sus normas de ingeniería de software.
- **Qué debe contener:** estructura de directorios, convenciones de nombres, linters, normas de commits, PRs y sincronización con AI-DLC.

---

## 1. Estructura de Directorios

- `documentacion-aidlc/`: Documentación viva y trazable según el estándar AI-DLC.
- `drizzle/`: Migraciones SQL generadas con `npm run db:generate`. No se editan a mano.
- `public/`: Archivos estáticos servidos directamente sin procesar (`marca/` se genera con `npm run marca:iconos`).
- `scripts/`: Scripts de mantenimiento en TypeScript, ejecutados con Node nativo (imports relativos con extensión `.ts`).
- `src/`: Código fuente de la aplicación.
  - `src/pages/`: Páginas y enrutamiento basado en archivos de Astro.
  - `src/components/`: Componentes reutilizables (`carta/`, `admin/`).
  - `src/layouts/`: Estructuras generales de página HTML.
  - `src/styles/`: `tokens.css` (variables de diseño) y `global.css`.
  - `src/lib/`: Lógica sin UI: `dominio/`, `db/`, `almacenamiento/` y, más adelante, `repositorios/` y `auth/`.
- `tests/`: `unit/`, `integracion/` (con SQLite real y migraciones) y `ayudantes/`.

---

## 2. Convenciones de Nombres y Estilo

- **Archivos de componentes Astro:** `PascalCase.astro` (e.g. `HeaderNav.astro`, `CardRecomendacion.astro`).
- **Archivos de utilidades y scripts:** `camelCase.ts` o `kebab-case.ts`.
- **Rutas en páginas:** `kebab-case.astro` o `index.astro` dentro de subcarpetas descriptivas.
- **Variables y funciones:** `camelCase`.
- **Constantes globales:** `UPPER_SNAKE_CASE`.

---

## 3. Calidad y Verificación

- Todo cambio debe pasar `npm run check`, `npm run test:coverage` (≥ 80 %) y `npm run build`.
- Tests primero (TDD) para la lógica de `src/lib/`.
- El dominio se nombra en español (`cartaRepo`, `sembrar`, `precio`). Las columnas se escriben en camelCase y se guardan en snake_case.
- Las páginas y acciones acceden a datos solo a través de repositorios. Solo los `index.ts` de `src/lib/*` leen `astro:env`.
- Cada cambio de esquema va acompañado de su migración (`npm run db:generate`).
- No introducir dependencias innecesarias o pesadas sin justificación técnica previa.
- Mantener la documentación AI-DLC sincronizada con los cambios de arquitectura y decisiones de negocio.
