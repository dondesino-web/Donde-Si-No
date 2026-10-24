# Estrategia de Pruebas

## Definición del documento

- **Para qué sirve:** define el enfoque, herramientas, niveles de prueba y criterios de calidad para verificar el correcto funcionamiento del software.
- **Cuándo se crea o actualiza:** en la fase de Iniciación/Construcción y al incorporar nuevas suites o herramientas de prueba.
- **Qué debe contener:** niveles de prueba (unitarias, integración, e2e), herramientas propuestas, comandos y cobertura objetivo.

---

## 1. Estado Actual de Pruebas

- **Suite configurada (Fase 0):** Vitest 5, con `getViteConfig` de Astro, y cobertura v8 con umbral del 80 % en `src/lib/**`.
- **40 tests en verde.** Ver [INFORME_COBERTURA.md](./INFORME_COBERTURA.md).
- **Desarrollo guiado por tests:** cada módulo se escribió con el test primero (RED → GREEN).

---

## 2. Niveles de Prueba

| Nivel | Herramienta | Alcance | Estado |
|---|---|---|---|
| **Estática / tipos** | `astro check` | Todo el proyecto | ✅ 0 errores |
| **Unitarias** | Vitest | Almacenamiento, validación de configuración; luego horario, precio CLP, JSON-LD, auth, i18n | ✅ En uso |
| **Integración** | Vitest + SQLite temporal con las **migraciones reales** | Esquema (restricciones, valores por defecto, `$onUpdate`), semilla (idempotencia, rollback); luego repositorios, acciones, `/qr`, `/api/evento` | ✅ En uso |
| **E2E y accesibilidad** | Playwright + `@axe-core/playwright` | Carta, cambio de idioma, login → editar precio → visible, QR | Fase 1 y 2 |
| **Rendimiento** | Lighthouse sobre el Preview Deployment de Vercel | ≥ 95 en las 4 categorías (móvil) | Fase 4 |

### Detalles de la infraestructura de pruebas

- `tests/ayudantes/bd.ts` crea una base SQLite por test, en una carpeta temporal compartida.
- `tests/ayudantes/global.ts` borra esa carpeta al terminar la suite: en Windows, libsql no libera el archivo hasta que termina el proceso.
- `@vercel/blob` se simula con `vi.mock`. El almacén local se prueba contra el disco real.

---

## 3. Comandos

```bash
npm run check          # tipos
npm test               # toda la suite
npm run test:coverage  # con cobertura (falla si baja del 80 %)
npm run build          # build de producción
```

---

## 4. Pendientes

- **Detectar desfase entre esquema y migraciones:** en CI (Fase 4), ejecutar `drizzle-kit generate` y fallar si produce una migración nueva.
- **Playwright y axe:** se instalan en la Fase 1, con la carta pública.
