# Informe de Cobertura de Pruebas

## Definición del documento

- **Para qué sirve:** registra el porcentaje de cobertura de código alcanzado por las suites de pruebas automatizadas.
- **Cuándo se crea o actualiza:** tras cada ejecución de pruebas en CI o auditoría local.
- **Qué debe contener:** métricas de líneas, ramas, funciones, declaraciones y fecha de medición.

---

## 1. Estado de Cobertura

- **Fecha de medición:** 2026-10-23 (cierre de la Fase 0)
- **Comando:** `npm run test:coverage`
- **Resultado:** 40 tests en verde (4 archivos)

| Métrica | Cobertura | Umbral |
|---|---|---|
| Declaraciones | 98,96 % | 80 % |
| Ramas | 100 % | 80 % |
| Funciones | 96,55 % | 80 % |
| Líneas | 98,76 % | 80 % |

- **Alcance:** `src/lib/**/*.ts`.
- **Excluidos:** `src/lib/**/index.ts`, los puntos de entrada que solo leen `astro:env`, que se cubrirán con E2E.

---

## 2. Historial

| Fecha | Tests | Líneas | Nota |
|---|---|---|---|
| 2026-08-26 | — | — | Sin suite configurada |
| 2026-10-23 | 40 | 98,76 % | Fase 0: esquema, semilla, almacenamiento y validación de configuración |
