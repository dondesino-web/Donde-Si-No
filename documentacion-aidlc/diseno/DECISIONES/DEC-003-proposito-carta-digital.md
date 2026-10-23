# DEC-003: El proyecto es la carta digital QR del local «Dónde Si No»

## Definición del documento

- **Para qué sirve:** corrige el propósito del proyecto, que en la iniciación se había inferido solo a partir del nombre del repositorio.
- **Cuándo se crea o actualiza:** al confirmar con el responsable el alcance real del producto.
- **Qué debe contener:** contexto, opciones, decisión, consecuencias y estado.

---

**Fecha:** 2026-10-22
**Estado:** Aceptado · validado por el responsable (`jhonabruzzi278`) en la sesión 03
**Responsable:** `jhonabruzzi278` (formalizado por agente de IA)

---

## 1. Contexto y problema

En la iniciación (2026-08-26) se **infirió**, a partir del nombre `Donde-Si-No`, que el proyecto era una «plataforma de recomendaciones Dónde Sí / Dónde No». Esa inferencia quedó marcada como pendiente de validación en INTENCION, REQUISITOS y MODELO_DOMINIO.

El responsable aclaró que **«Dónde Si No» es un local de comida rápida y colaciones** ubicado en Ruta G60 Km 3, Chocalán, Melipilla. Compartió su ficha de Google, sus afiches y una referencia de producto: las cartas QR de QrCarta.

## 2. Opciones consideradas

1. **Carta digital QR del local (elegida):** carta pública, visible en Google, accesible y ultrarrápida, más un panel sencillo para que el dueño la mantenga.
2. **Mantener la plataforma de recomendaciones:** no corresponde a ninguna necesidad real.

## 3. Decisión

El producto es la **carta digital en código QR de Dónde Si No**, con panel de administración propio. El MVP incluye:

- Carta, promociones, menú del día, fotos, alérgenos y estado «agotado».
- QR permanente y SEO local.
- Estadísticas, versión imprimible y versión en inglés.

Queda **fuera del MVP** el pedido por WhatsApp.

El plan detallado está en [`PLAN_CARTA_DIGITAL.md`](../PLAN_CARTA_DIGITAL.md).

## 4. Consecuencias

- **Positivas:** el alcance, los usuarios y el modelo de dominio quedan definidos con datos reales (extraídos de Google y de los afiches).
- **Documentación:** se reescriben INTENCION, REQUISITOS, PARTES_INTERESADAS, HISTORIAS_USUARIO, CRITERIOS_ACEPTACION, MODELO_DOMINIO y DISENO_LOGICO. Las versiones anteriores quedan en el historial de git.
- **Pendiente de validación humana:** contenido que solo puede aportar el dueño (precios, horario completo, fotos, condiciones del 2x1, redes y traducciones).
