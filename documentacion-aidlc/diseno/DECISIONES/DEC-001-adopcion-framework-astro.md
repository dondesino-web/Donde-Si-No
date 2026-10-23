# DEC-001: Adopción de Astro como Framework Base

## Definición del documento

- **Para qué sirve:** registra la justificación técnica, alternativas consideradas y consecuencias de adoptar Astro.
- **Cuándo se crea o actualiza:** al tomar o formalizar la decisión arquitectónica.
- **Qué debe contener:** contexto, opciones, decisión, consecuencias y estado.

---

**Fecha:** 2026-08-26  
**Estado:** Aceptado / En uso  
**Responsable:** `jhonabruzzi278` (formalizado por Agente de IA)

---

## 1. Contexto y Problema

El proyecto `Donde-Si-No` requiere una arquitectura web ligera, orientada al contenido y con excelente rendimiento SEO y tiempos de carga instantáneos para presentar recomendaciones y comparativas.

## 2. Opciones Consideradas

1. **Astro (Elegida):** Excelente soporte para SSG, 0 KB JavaScript por defecto, arquitectura de islas para hidratación parcial cuando se requiera.
2. **Next.js:** Potente pero introduce sobrecarga de React y bundle JS cliente más pesado para sitios principalmente informativos.
3. **HTML/CSS Estático plano:** Sin sistema de componentes modular, dificultando la reutilización y escalabilidad.

## 3. Decisión

Adoptar **Astro v7** como framework central del proyecto.

## 4. Consecuencias

- **Positivas:** Máximo rendimiento LCP/SEO, sintaxis familiar basada en componentes `.astro`, flexibilidad para incorporar componentes React/Vue/Svelte en el futuro si hiciera falta.
- **Negativas / Riesgos:** Requiere familiaridad con la sintaxis de plantillas de Astro y sus ciclos de compilación.
