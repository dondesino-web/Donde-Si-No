# Diseño Lógico del Sistema

## Definición del documento

- **Para qué sirve:** traduce el modelo de dominio en componentes técnicos, patrones de diseño, flujos de datos y contratos de interfaz.
- **Cuándo se crea o actualiza:** en la fase de Diseño / Construcción técnica.
- **Qué debe contener:** arquitectura en capas, patrones lógicos, flujo de información, gestión de estado y contratos de interfaz.

---

## 1. Patrones de Diseño y Capas Lógicas

```text
┌──────────────────────────────────────────────────────────────┐
│ Presentación                                                 │
│ - src/pages/        carta (/ y /en/), /imprimir, /admin/*    │
│ - src/components/   carta/ y admin/ (Astro, sin framework UI) │
│ - src/actions/      Astro Actions del panel (validación Zod)  │
└──────────────────────────────┬───────────────────────────────┘
                               │ solo a través de repositorios
┌──────────────────────────────▼───────────────────────────────┐
│ Dominio y acceso a datos                                     │
│ - src/lib/dominio/       tipos y reglas (horario, alérgenos)  │
│ - src/lib/repositorios/  cartaRepo, negocioRepo, statsRepo    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ Infraestructura                                              │
│ - src/lib/db/              Drizzle + libSQL (Turso)  ✅       │
│ - src/lib/almacenamiento/  Vercel Blob / disco local ✅       │
│ - src/lib/auth/            scrypt + cookie HMAC (Fase 2)      │
└──────────────────────────────────────────────────────────────┘
```

- **Repositorio:** las páginas y las acciones nunca consultan la base directamente.
- **Inyección por fábrica:** `crearClienteBd(config)` y `elegirAlmacen(opciones)` reciben su configuración de forma explícita, lo que permite usarlas en tests y scripts. `obtenerBd()` y `obtenerAlmacen()` son los únicos puntos que leen `astro:env`.
- **Validación en el borde:** Zod en las acciones y en los endpoints. La base añade sus propias restricciones (`CHECK` de precio ≥ 0, una sola fila de negocio, eventos permitidos).

---

## 2. Flujo de Datos

1. **Lectura pública:**
   - Petición a `/` → CDN de Vercel.
   - Si la página está en caché, se responde sin ejecutar código.
   - Si no, la función Astro lee los repositorios, renderiza el HTML y Vercel lo cachea (máximo 1 h).
2. **Edición (Fase 2):**
   - El dueño envía un formulario → acción con Zod → repositorio → Turso.
   - Luego `revalidar()` hace un HEAD con `x-prerender-revalidate` a `/`, `/en/`, `/imprimir` y `/en/print`.
   - La próxima visita ve el cambio.
3. **Fotos:**
   - El navegador comprime a WebP (480 y 1200 px).
   - `/api/admin/upload` valida sesión, tamaño y *magic bytes* → `AlmacenImagenes.subir()`.
   - La URL se guarda en el campo `imagen` (JSON).
4. **Estadísticas (Fase 3):**
   - Beacon a `/api/evento` (lista cerrada de eventos), o `/qr`.
   - Incremento atómico en `estadistica_diaria`.

---

## 3. Decisiones de Stack Tecnológico

Ver [ARQUITECTURA.md](./ARQUITECTURA.md) y [DEC-004](./DECISIONES/DEC-004-arquitectura-ssr-isr-turso-blob.md).

---

## 4. Trazabilidad

- **Implementado (Fase 0):**
  - `src/lib/db/` (esquema, cliente con validación de producción, semilla idempotente y transaccional).
  - `src/lib/almacenamiento/`.
  - `src/lib/dominio/tipos.ts`.
- **Pendiente:** repositorios, acciones, autenticación e i18n (Fases 1 a 3).
