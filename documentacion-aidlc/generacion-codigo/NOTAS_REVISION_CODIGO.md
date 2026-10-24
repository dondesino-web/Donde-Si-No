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
- **`zod` 4.1.11 anidado** (vía `@vercel/blob` y `@vercel/functions` → `@vercel/oidc` → `@vercel/cli-config`, que lo fija en esa versión exacta): avisa de consumo de memoria al validar colecciones enormes. Solo se usa para leer la configuración y el token OIDC de Vercel, sin entrada de usuarios; el `zod` que valida los formularios es el de Astro (4.6.7, ya corregido). **Aceptado**; la última versión de cada paquete ya está instalada. Se reaudita al actualizar `@astrojs/vercel` o `@vercel/blob`.
- **CI:** `npm audit --omit=dev --audit-level=critical` bloquea solo ante severidad crítica; los avisos altos de arriba están aceptados aquí.

## Revisión final previa al lanzamiento (2026-10-24)

Dos revisiones independientes de todo el repositorio (seguridad y calidad de código), sin hallazgos críticos ni altos.

**Aplicado**
- Las acciones (`/_actions/*`) exigen sesión también en el middleware, no solo en cada acción: una acción nueva sin guardia propia ya no queda abierta.
- Cookie de sesión `__Host-sesion` en producción (solo `Secure`, ruta `/`, sin `Domain`).
- Límite de intentos de login: las direcciones IPv6 se cuentan por red /64 y las filas vencidas se purgan en el cron diario.
- Limpieza de fotos huérfanas más prudente: se detiene si en un lote de 5 o más archivos antiguos todos parecen huérfanos.
- `/uploads/*` fuera de la caché ISR; cabeceras de seguridad también para los archivos estáticos (`vercel.json`).
- El campo «WhatsApp» del panel ya llega a la carta (botón `wa.me`); antes se guardaba y no se usaba.
- La comprobación de fotos en uso hace tres consultas en total, no una por foto.
- Los tipos de datos del repositorio reutilizan los de validación (una sola definición); el CI verifica que el esquema y las migraciones estén sincronizados.

**Decidido no aplicar**
- *Tope global de intentos de login:* convertiría un intento de fuerza bruta en un bloqueo del dueño. La defensa adecuada es el límite de tasa de Vercel Firewall sobre `/admin/login`.
- *CSP completa:* Astro solo la genera en `build` y el adaptador de Vercel no se puede ejecutar en local; se prueba primero en modo solo-reporte en el preview.
- *Sesiones revocables:* el token es sin estado a propósito (un solo administrador); rotar `SESSION_SECRET` cierra todas.

**Deuda técnica conocida (sin urgencia)**
- Bloques repetidos en las páginas del panel (avisos, botones ↑/↓, script de confirmación): conviene extraer componentes.
- Cuatro acciones «mover» y tres «establecer estado» casi idénticas.
- `aMinutos`/`cruzaMedianoche` y la validación de fechas ISO están duplicadas entre `dominio/` y `validacion/`.
- Funciones por encima de 50 líneas: `validarEntorno`, `iniciar` de `campoFoto.ts` y el encabezado de `admin/local.astro`.
