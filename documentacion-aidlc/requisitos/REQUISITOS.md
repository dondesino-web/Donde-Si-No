# Requisitos del Sistema

## Definición del documento

- **Para qué sirve:** especifica los requisitos funcionales y no funcionales que guiarán el desarrollo.
- **Cuándo se crea o actualiza:** en la fase de Iniciación y cada vez que se refinen o añadan funcionalidades.
- **Qué debe contener:** requisitos funcionales (RF), requisitos no funcionales (RNF), prioridades (MoSCoW), fuente y estado.

---

## 1. Requisitos Funcionales (RF)

| ID | Requisito | Prioridad | Fase | Estado |
|---|---|---|---|---|
| **RF-01** | Carta pública en `/` con categorías, productos (foto, nombre, descripción, precio en CLP o «Consultar»), alérgenos y estado «Agotado» | Must | 1 | Pendiente |
| **RF-02** | Encabezado con logo, eslogan y estado abierto/cerrado según el horario (zona `America/Santiago`) | Must | 1 | Pendiente |
| **RF-03** | Barra de acciones: Cómo llegar, Llamar, Opinar en Google, Compartir y Uber Eats | Must | 1 | Pendiente |
| **RF-04** | Promociones activas, menú del día y hasta 8 fotos destacadas | Must | 1 | Pendiente |
| **RF-05** | Navegación por categorías con anclas | Must | 1 | Pendiente |
| **RF-06** | Versión en inglés en `/en/`. Si falta la traducción de un campo, se muestra en español. | Must | 1 | Pendiente |
| **RF-07** | Versión imprimible (`/imprimir`, `/en/print`) optimizada para papel y PDF | Must | 1 | Pendiente |
| **RF-08** | Datos estructurados `Restaurant` + `Menu` (JSON-LD), sitemap, robots y OpenGraph | Must | 1 | Pendiente |
| **RF-09** | Panel protegido por contraseña para el dueño, con límite de intentos de login | Must | 2 | Pendiente |
| **RF-10** | CRUD de categorías, productos, promociones, menú del día, fotos destacadas y datos del local, con publicación instantánea | Must | 2 | Pendiente |
| **RF-11** | Subida de fotos desde el celular, comprimidas a WebP en el navegador | Must | 2 | Base lista (almacén de imágenes) |
| **RF-12** | Toggle «Agotado» de un toque y reordenar con botones accesibles | Must | 2 | Pendiente |
| **RF-13** | QR permanente (`/qr`) descargable en SVG/PNG y tarjeta imprimible para mesas | Must | 3 | Pendiente |
| **RF-14** | Estadísticas sin cookies: visitas, escaneos del QR y clics en acciones, visibles en el panel | Must | 3 | Base lista (tabla `estadistica_diaria`) |
| **RF-15** | Pedido por WhatsApp | Won't (MVP) | — | Descartado por el responsable |

---

## 2. Requisitos No Funcionales (RNF)

| ID | Categoría | Requisito | Métrica / Criterio | Estado |
|---|---|---|---|---|
| **RNF-01** | Rendimiento | Carta servida desde la caché ISR de Vercel, mínimo JS | LCP < 1,5 s en 4G; HTML+CSS+JS ≤ 50 KB gzip; JS ≤ 5 KB | Base lista (ISR configurado) |
| **RNF-02** | Accesibilidad | WCAG 2.2 AA en la carta y el panel | axe sin violaciones; contraste ≥ 4,5:1; objetivos táctiles ≥ 44 px | Base lista (tokens verificados) |
| **RNF-03** | SEO | Página legible por Google, con datos del local y la carta | Lighthouse SEO ≥ 95; Rich Results Test válido | Pendiente |
| **RNF-04** | Seguridad | Sin secretos en el repositorio; login robusto; subidas validadas; cabeceras de seguridad | Revisión de `security-reviewer` sin hallazgos CRITICAL/HIGH | Base lista (`astro:env`, almacén con validación) |
| **RNF-05** | Privacidad | Estadísticas sin cookies ni IPs en claro | Revisión de código | Base lista (esquema) |
| **RNF-06** | Mantenibilidad | TypeScript estricto, patrón repositorio y tests | `astro check` sin errores; cobertura ≥ 80 % en `src/lib` | ✅ Cumplido en la Fase 0 (≈93 %) |
| **RNF-07** | Compatibilidad | Navegadores modernos móviles y de escritorio | Sin polyfills pesados | Cumplido |

---

## 3. Matriz de Trazabilidad y Validación

- **RF-01 a RF-14 y RNF-01 a RNF-05:** derivados del plan aprobado ([`PLAN_CARTA_DIGITAL.md`](../diseno/PLAN_CARTA_DIGITAL.md)) y de la referencia QrCarta compartida por el responsable.
- **RF-15:** descartado explícitamente por el responsable (2026-10-22).
- **Historias asociadas:** ver [`HISTORIAS_USUARIO.md`](../historias/HISTORIAS_USUARIO.md).
