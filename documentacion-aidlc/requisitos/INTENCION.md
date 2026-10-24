# Intención del Proyecto

## Definición del documento

- **Para qué sirve:** define el propósito central, objetivos de negocio, métricas de éxito y límites del proyecto.
- **Cuándo se crea o actualiza:** al inicio del proyecto (fase de Iniciación) y cuando cambie la visión estratégica.
- **Qué debe contener:** propósito, objetivos de negocio, métricas de éxito, restricciones y supuestos de alto nivel.

---

## 1. Propósito

**donde-sino.com** es la **carta digital en código QR de «Dónde Si No»**, un local de comida rápida y colaciones en Ruta G60 Km 3 (Camino a Rapel), Chocalán, Melipilla.

Ver [DEC-003](../diseno/DECISIONES/DEC-003-proposito-carta-digital.md). La versión anterior de este documento suponía una plataforma de recomendaciones; esa inferencia quedó descartada.

- **Para los clientes:** una carta moderna que se abre al escanear el QR o desde Google, sin instalar nada, con fotos, precios, promociones y alérgenos.
- **Para el dueño:** un panel sencillo para mantener la carta al día desde el celular, sin depender de un técnico.

---

## 2. Objetivos de Negocio

- **Objetivo 1 · Que te encuentren en Google:** página pública con datos estructurados del restaurante y la carta, enlazable desde la ficha de Google y desde Maps.
- **Objetivo 2 · Carta siempre actualizada:** cambios de precio, productos, fotos y disponibilidad publicados al instante.
- **Objetivo 3 · QR permanente:** un solo QR para mesas, vitrina, tarjetas y redes, que nunca hay que reimprimir.
- **Objetivo 4 · Vender más:** fotos de los platos, promociones destacadas («Churrascos 2x1») y menú del día visibles de inmediato.
- **Objetivo 5 · Decidir con datos:** visitas, escaneos del QR y clics en Llamar / Cómo llegar / Opinar.

---

## 3. Métricas de Éxito (KPIs)

- **LCP** < 1,5 s en móvil 4G. Lighthouse móvil ≥ 95 en Performance, Accesibilidad, Buenas prácticas y SEO.
- **Peso de la carta:** HTML + CSS + JS ≤ 50 KB gzip, sin imágenes. JS ≤ 5 KB.
- **Accesibilidad:** WCAG 2.2 AA, sin violaciones de axe.
- **Adopción:** escaneos de QR y visitas semanales visibles en el panel.

> ⚠️ **Pendiente de validación humana:** metas comerciales concretas, como escaneos por semana o clics a «Llamar».

---

## 4. Restricciones Técnicas y de Negocio

- **Framework:** Astro 7 con TypeScript, CSS propio con tokens y sin frameworks de UI.
- **Hosting:** Vercel, el dominio `www.donde-sino.com` ya está ahí. El plan Hobby es solo para uso no comercial; para un negocio corresponde Pro.
- **Presupuesto:** servicios con plan gratuito suficiente (Turso, Vercel Blob).
- **Usuario administrador:** el dueño, desde el celular, sin conocimientos técnicos.

---

## 5. Supuestos y Trazabilidad

- **Extraído:** datos del local desde su ficha de Google (dirección, teléfono, cierre a la 1 a.m., $5.000–10.000 por persona, descripción del dueño) y desde sus afiches (productos, promo 2x1, servicios Wi-Fi, Pet Friendly y Baños, eslogan «¡Aquí hay sabor!»).
- **Validado por el responsable (2026-10-22):** panel propio con base de datos, Vercel, y MVP con estadísticas, versión imprimible e inglés.
- **⚠️ Pendiente de validación humana:** precios, horario completo, fotos reales, condiciones del 2x1, contenido de desayunos y colaciones, WhatsApp, Instagram, Place ID de Google y traducciones.
