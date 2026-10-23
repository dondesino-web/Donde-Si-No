# Guía de Contribución (CONTRIBUTING.md)

## Definición del documento

- **Para qué sirve:** define el flujo de trabajo para colaborar en el repositorio, incluyendo instalación, creación de ramas, formato de commits y pull requests.
- **Cuándo se crea o actualiza:** en la fase inicial del proyecto y cuando cambie la dinámica de equipo o flujos Git.
- **Qué debe contener:** requisitos previos, comandos de inicio rápido, convenciones de commits, pruebas y política de ramas.

---

## 1. Requisitos Previos

- **Node.js:** versión 22.23.4 o superior (lo exige Astro 7.4; Node 24 LTS recomendado).
- **npm:** versión 10 o superior.
- **Git:** Instalado y configurado en tu entorno local.

---

## 2. Inicio Rápido (Local Setup)

```bash
# 1. Clonar el repositorio
git clone https://github.com/jhonabruzzi278/Donde-Si-No.git
cd Donde-Si-No

# 2. Instalar dependencias
npm install

# 3. Crear la base de datos local y cargar los datos iniciales
npm run db:migrate
npm run db:seed

# 4. Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:4321`.

---

## 3. Flujo de Trabajo y Ramas

1. Crea una rama descriptiva a partir de `main`:
   - `feat/nombre-funcionalidad` para nuevas características.
   - `fix/descripcion-error` para corrección de bugs.
   - `docs/nombre-mejora` para cambios documentales.
2. Formato de commits sugerido (Conventional Commits):
   - `feat: agregar catálogo de recomendaciones`
   - `fix: corregir contraste en tema oscuro`
   - `docs: actualizar modelo de dominio en ai-dlc`
3. Antes de enviar cambios:
   - Ejecuta `npm run check`, `npm run test:coverage` y `npm run build`.
   - Si cambiaste `src/lib/db/esquema.ts`, genera la migración con `npm run db:generate` y versiónala.
   - Si creas nuevas decisiones o cambias arquitectura, actualiza `/documentacion-aidlc/`.
