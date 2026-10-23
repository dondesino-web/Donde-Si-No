# Notas de Revisión de Código

## Definición del documento

- **Para qué sirve:** compila observaciones técnicas, hallazgos de calidad, revisiones de seguridad y directrices de refactorización detectadas en revisiones.
- **Cuándo se crea o actualiza:** durante auditorías de código o antes de consolidar cambios importantes a la rama principal.
- **Qué debe contener:** fecha, revisor/herramienta, observaciones de estilo, rendimiento, seguridad y acciones recomendadas.

---

## 1. Auditoría Inicial (2026-08-26)

- **Revisor:** Antigravity AI Assistant.
- **Alcance:** Base de código inicial (Astro Minimal).
- **Hallazgos:**
  1. **Dependencias:** `package.json` tiene dependencias actualizadas a Astro v7.2.7 sin vulnerabilidades detectadas por `npm audit`.
  2. **TypeScript:** `tsconfig.json` extiende `astro/tsconfigs/strict`, garantizando un chequeo estricto de tipos.
  3. **Estructura:** Se encuentra limpia y lista para la creación de componentes en `src/components/` y estilos globales en `src/styles/`.
- **Acción Recomendada:** Configurar linter/formateador (e.g. ESLint / Prettier con plugin Astro) y un framework de pruebas unitarias (Vitest) antes de expandir el código de negocio.

---

## 2. Revisión de la Fase 0 (2026-10-23)

- **Revisores:** subagentes `code-reviewer` y `security-reviewer` (Claude Code).
- **Alcance:** configuración, `src/lib/**`, scripts, tests y migración inicial.
- **Resultado:** sin hallazgos CRITICAL.

### Corregidos

| Severidad | Hallazgo | Corrección |
|---|---|---|
| HIGH (ambos revisores) | `TURSO_DATABASE_URL` tiene un valor por defecto `file:local.db`: producción podría arrancar contra un SQLite efímero sin dar error | `validarConfigBd()` rechaza `file:` y la falta de token en producción (`src/lib/db/cliente.ts`) |
| MEDIUM | El borrado en Blob aceptaba cualquier ruta del store | Solo acepta `https://*.public.blob.vercel-storage.com/carta/<uuid>.webp` |
| MEDIUM | `estadistica_diaria.evento` era texto libre: un beacon público podía llenar la base | Lista cerrada `EVENTOS_ESTADISTICA` más un `CHECK` en SQL |
| MEDIUM | `$onUpdate` no estaba probado | Test con reloj simulado. Se documenta que los upserts deben asignar `actualizadoEn` a mano |
| MEDIUM | La semilla publicaba la promo 2x1 sin condiciones confirmadas | La promo queda `activa: false` hasta que el dueño la confirme |
| LOW | Sin `CHECK` de una sola fila en `negocio` ni de precio ≥ 0 | `CHECK` agregados y probados |
| LOW | Código postal 8320000 de Google (corresponde a Santiago centro) | Queda `null` hasta confirmarlo |
| LOW | Tests de la semilla usaban la misma semilla como oráculo; faltaba probar el rollback | Expectativas explícitas y test de rollback ante un fallo a mitad de carga |
| LOW | `intento_login` sin índice para purgar | Índice en `ventana_inicio`; se documenta HMAC de IP (no SHA simple) |
| LOW | Sin aviso si falta `ISR_BYPASS_TOKEN` en Vercel | Advertencia en el build (será obligatorio en la Fase 2) |
| LOW | El teardown de tests podía fallar con `EBUSY` en Windows | Reintentos y advertencia en lugar de fallar la suite |
| LOW | `db:seed` podía sembrar producción por error | Muestra el host de destino antes de escribir |

### Verificado como no aplicable

- **«Las exclusiones ISR con RegExp rompen las rutas dinámicas del panel»:** se comprobó con un build que `/admin/producto/[id]` genera `^/admin/producto/([^/]+?)$ → _render` (sin caché).

### Trasladados a fases siguientes (reglas en ARQUITECTURA §3)

- Fase 2:
  - Validar con Zod las URLs del panel (`https:` y host).
  - Borrar fotos usando la URL guardada en la base.
  - Límite de tamaño y *magic bytes* en la subida.
  - Login con HMAC de IP desde `clientAddress`, upsert atómico y purga de ventanas.
  - `ISR_BYPASS_TOKEN`, `SESSION_SECRET` y `ADMIN_PASSWORD_HASH` como secretos obligatorios en `astro:env`.
- Fase 3: contar visitas solo con el beacon o con `/qr`, nunca al renderizar páginas cacheadas.
- Fase 4: en CI, verificar que `drizzle-kit generate` no produzca migraciones nuevas.

### Dependencias (`npm audit`)

- **`path-to-regexp`** (vía `@astrojs/vercel` → `@vercel/routing-utils`): se ejecuta solo en build, con patrones propios. El arreglo forzado bajaría el adaptador a una versión incompatible con Astro 7. **Aceptado**; se revisa al actualizar el adaptador.
- **`esbuild` ≤ 0.24** (vía `drizzle-kit` → `@esbuild-kit`): solo afecta al servidor de desarrollo de esbuild, que el proyecto no usa. **Aceptado**; se revisa al actualizar `drizzle-kit`.
- **`sharp`:** corregido con `npm audit fix` (0.35.5).
