# Criterios de Aceptación

## Definición del documento

- **Para qué sirve:** define las condiciones medibles y verificables que deben cumplirse para dar por completada cada historia de usuario.
- **Cuándo se crea o actualiza:** junto con la definición o refinamiento de cada historia de usuario antes de iniciar su construcción.
- **Qué debe contener:** escenarios en formato Dado/Cuando/Entonces (Gherkin) o listas de verificación objetivas por cada historia.

---

## 1. Carta pública

### HU-01 · Abrir la carta desde el QR
- **Dado** un celular con 4G, **cuando** se escanea el QR (`/qr`), **entonces** la carta se muestra con LCP < 1,5 s y el escaneo queda contado.
- La carta pesa ≤ 50 KB gzip (HTML + CSS + JS, sin imágenes) y usa ≤ 5 KB de JS.

### HU-02 · Navegar y ver productos
- Cada categoría visible tiene un chip en la navegación que lleva a su sección. Las categorías vacías u ocultas no aparecen.
- Cada producto muestra nombre y precio en formato CLP (`$4.500`) o «Consultar» si no tiene precio. Si los tiene, muestra también descripción, foto y alérgenos en texto.
- **Dado** un producto agotado, **entonces** se lee «Agotado» en texto (no solo por color) y sigue visible.

### HU-03 · Promociones y menú del día
- Solo se muestran promociones activas cuyo rango de fechas incluya hoy (hora de Chile).
- El menú del día aparece solo si está activo y su fecha es hoy o no tiene fecha.

### HU-04 · Encontrar y llegar
- El JSON-LD `Restaurant` con su `Menu` pasa el Rich Results Test sin errores.
- «Cómo llegar» abre Google Maps; «Llamar» usa `tel:+56988860939`; «Opinar» abre la reseña de Google (cuando exista el Place ID).
- Sin JavaScript, el horario se muestra en texto; con JavaScript, además aparece «Abierto ahora» o «Cerrado», calculado en `America/Santiago` y con soporte para horarios que cruzan la medianoche.

### HU-05 · Inglés
- `/en/` muestra la interfaz en inglés. Cada campo sin traducción se muestra en español.
- Ambas versiones declaran `hreflang` y su URL canónica.

### HU-06 · Accesibilidad
- axe sin violaciones en `/`, `/en/` y el panel.
- Todos los controles funcionan con teclado y tienen foco visible. Los objetivos táctiles miden ≥ 44 px.
- Sin desborde horizontal entre 320 px y 1920 px; reflow correcto con zoom al 200 %.

---

## 2. Panel del dueño

### HU-07 · Login
- Una contraseña incorrecta muestra un error genérico. Tras 5 intentos fallidos en 15 minutos desde la misma IP, el login se bloquea temporalmente.
- La cookie de sesión es `HttpOnly`, `Secure`, `SameSite=Strict` y caduca a los 7 días.
- Las rutas `/admin/*` sin sesión redirigen al login y nunca quedan en la caché ISR.

### HU-08 a HU-11 · Editar la carta
- **Dado** que el dueño cambia un precio y guarda, **cuando** recarga `/`, **entonces** ve el precio nuevo sin que haya habido un despliegue.
- Las fotos se suben comprimidas a WebP (480 px y 1200 px). El servidor rechaza todo lo que no sea WebP válido (validado por *magic bytes*) o pese más de 1,5 MB.
- Cada formulario valida en el servidor (Zod) y asocia los errores a su campo (`aria-describedby`).

### HU-12 · QR
- El QR codifica `https://www.donde-sino.com/qr` y se descarga en SVG y PNG.

### HU-13 · Estadísticas
- El panel muestra los conteos de hoy y de los últimos 7 días. No se usan cookies ni se guardan IPs en claro.

### HU-14 · Versión imprimible
- `/imprimir` se imprime en A4 sin elementos de navegación e incluye el QR al pie.

---

> ⚠️ **Pendiente de validación humana:** umbrales del bloqueo de login (5 intentos en 15 min) y la caducidad de la sesión (7 días).
