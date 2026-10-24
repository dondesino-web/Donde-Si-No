# Arquitectura del Sistema

## Definición del documento

- **Para qué sirve:** describe la estructura técnica global del proyecto, responsabilidades de carpetas, límites del sistema y decisiones estructurales.
- **Cuándo se crea o actualiza:** en la fase de Iniciación y cada vez que cambie la estructura de alto nivel del repositorio.
- **Qué debe contener:** árbol de componentes y carpetas, stack, límites del sistema, integraciones y enlaces a decisiones ADR.

---

## 1. Estructura del Repositorio

```text
Donde-Si-No/
├── documentacion-aidlc/          # Documentación viva AI-DLC (incluye PLAN_CARTA_DIGITAL.md y ADRs)
├── drizzle/                      # Migraciones SQL generadas por drizzle-kit (versionadas)
├── public/
│   ├── favicon.ico
│   └── marca/                    # Logo optimizado e íconos (generados por scripts/generar-iconos.ts)
├── scripts/
│   ├── generar-iconos.ts         # Logo original → WebP/JPEG/ICO
│   └── sembrar.ts                # Carga la semilla en la base configurada
├── src/
│   ├── assets/marca/             # Logo original (fuente de los íconos)
│   ├── lib/
│   │   ├── almacenamiento/       # AlmacenImagenes: Vercel Blob (prod) / disco local (dev)
│   │   ├── db/                   # Esquema Drizzle, cliente, semilla y conexión de la app
│   │   └── dominio/              # Tipos del dominio (horario, alérgenos, eventos, imagen)
│   ├── pages/                    # Rutas (hoy: portada provisional)
│   └── styles/                   # tokens.css (diseño) y global.css (base accesible)
├── tests/
│   ├── ayudantes/                # BD temporal con migraciones reales, setup global
│   ├── integracion/              # Esquema y semilla contra SQLite real
│   └── unit/                     # Almacenamiento, cliente de BD
├── astro.config.mjs              # Vercel + ISR, i18n es/en, esquema de variables de entorno
├── drizzle.config.ts
├── vitest.config.ts
└── .env.example                  # Variables necesarias (sin valores secretos)
```

Previstas en las Fases 1 a 3: `src/components/carta/`, `src/components/admin/`, `src/layouts/`, `src/actions/`, `src/middleware.ts`, `src/lib/repositorios/`, `src/lib/auth/` y `src/i18n/`.

---

## 2. Stack Tecnológico

| Componente | Tecnología | Versión | Propósito |
|---|---|---|---|
| Framework | Astro (`output: 'server'`) | ^7.4.2 | Páginas, panel y acciones con mínimo JS en el cliente |
| Adaptador | `@astrojs/vercel` con ISR | ^11.0.16 | Caché de la carta en la CDN, invalidación al guardar |
| Base de datos | Turso (libSQL) + `drizzle-orm` | ^0.18 / ^0.45 | Datos de la carta; SQLite en archivo para desarrollo y tests |
| Migraciones | `drizzle-kit` | ^0.31 | SQL versionado en `drizzle/` |
| Imágenes | `@vercel/blob` | ^2.8 | Fotos WebP públicas e inmutables |
| Pruebas | Vitest + `@vitest/coverage-v8` | ^5.0 | Unitarias e integración (cobertura ≥ 80 %) |
| Tipos | TypeScript estricto + `@astrojs/check` | ^6.0 / ^0.9 | `npm run check` |
| Runtime | Node.js | ≥ 22.23.4 | Scripts en TypeScript nativo (type stripping) |

---

## 3. Límites y Fronteras del Sistema

- **Entrada pública:**
  - `/` y `/en/`: caché ISR.
  - `/imprimir`.
  - `/qr`: sin caché, cuenta el escaneo y redirige.
  - `/api/evento`: sin caché, beacon de estadísticas.
- **Entrada privada:** `/admin/*` y `/_actions/*`, sin caché y protegidas por sesión (Fase 2).
- **Dependencias externas:** Turso (datos), Vercel Blob (fotos), Google Maps y Reseñas (enlaces salientes), Uber Eats (enlace saliente).

### Reglas de arquitectura (de las revisiones de la Fase 0)

1. **Las páginas públicas cacheadas no varían por usuario.** Nada que dependa de cookies, sesión o IP en `/` ni en `/en/`: la versión cacheada se sirve a todos. Tampoco `Set-Cookie` en rutas con ISR.
2. **Toda ruta nueva fuera de la carta pública va en `isr.exclude`.** Después de cada build se revisa `.vercel/output/config.json`.
3. **Sin rutas públicas dinámicas de captura** (`[...slug]`) en la raíz: podrían atrapar URLs del panel y cachearlas. Las rutas dinámicas del panel (`/admin/producto/[id]`) se enrutan sin caché; verificado en el build.
4. **Contar visitas solo fuera de la caché:** con el beacon a `/api/evento` o con `/qr`, nunca al renderizar.
5. **Los upserts (`onConflictDoUpdate`) asignan `actualizadoEn` a mano:** `$onUpdate` solo actúa en `.update()`.
6. **URLs que vienen del panel** (redes, Maps, reseña, fotos) se validan con Zod (`https:` y host conocido) antes de guardarse.
7. **Las fotos se borran a partir de la URL guardada en la base**, nunca de una URL enviada por el cliente.

---

## 4. Registro de Decisiones de Arquitectura (ADR)

- [DEC-001: Adopción de Astro como Framework Base](./DECISIONES/DEC-001-adopcion-framework-astro.md)
- [DEC-002: Implementación de Metodología Documental AI-DLC](./DECISIONES/DEC-002-adopcion-metodologia-aidlc.md)
- [DEC-003: El proyecto es la carta digital QR del local «Dónde Si No»](./DECISIONES/DEC-003-proposito-carta-digital.md)
- [DEC-004: SSR con caché ISR en Vercel, Turso + Drizzle, Vercel Blob y autenticación propia](./DECISIONES/DEC-004-arquitectura-ssr-isr-turso-blob.md)
