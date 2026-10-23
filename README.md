# Donde-Si-No

> Carta digital en código QR de **Dónde Si No**, local de comida rápida y colaciones en Ruta G60 Km 3, Chocalán, Melipilla. Mobile first, accesible y ultrarrápida, con un panel sencillo para que el dueño actualice precios, fotos y promociones.

🌐 **Sitio en vivo:** [https://www.donde-sino.com/](https://www.donde-sino.com/) (alojado en **Vercel**)
📋 **Plan aprobado:** [`documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md`](./documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md). La Fase 0 está terminada.

---

## 🚀 Inicio Rápido

Requiere Node.js 22.23.4 o superior.

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Copiar variables de entorno; en local funcionan los valores por defecto
cp .env.example .env

# 3. Crear la base de datos local y cargar los datos iniciales
npm run db:migrate
npm run db:seed

# 4. Iniciar el servidor de desarrollo en http://localhost:4321
npm run dev
```

---

## 🛠️ Stack Tecnológico

- **Framework:** [Astro 7](https://astro.build) con renderizado en servidor y caché ISR en Vercel
- **Datos:** [Turso](https://turso.tech) (libSQL/SQLite) + [Drizzle ORM](https://orm.drizzle.team)
- **Fotos:** Vercel Blob (en local, `public/uploads/`)
- **Lenguaje:** TypeScript estricto (ESM)
- **Pruebas:** Vitest, con cobertura ≥ 80 %
- **Metodología:** [AI-DLC](./documentacion-aidlc/00_METADATOS_PROYECTO.md)

---

## 🧞 Comandos Disponibles

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Build de producción para Vercel (`.vercel/output/`) |
| `npm run check` | Verificación de tipos (`astro check`) |
| `npm test` | Ejecuta la suite de pruebas |
| `npm run test:coverage` | Pruebas con cobertura (umbral del 80 %) |
| `npm run db:generate` | Genera una migración SQL a partir de `src/lib/db/esquema.ts` |
| `npm run db:migrate` | Aplica las migraciones a la base configurada |
| `npm run db:seed` | Carga los datos iniciales del local (idempotente) |
| `npm run marca:iconos` | Regenera el logo optimizado y los íconos desde `src/assets/marca/` |

> `astro preview` no está disponible con el adaptador de Vercel: para previsualizar se usan los Preview Deployments de Vercel.

---

## 📚 Documentación del proyecto (AI-DLC)

Estado actual: **CONSTRUCCIÓN**. Fase 0 (fundaciones) terminada.

- 📋 [Metadatos del Proyecto](./documentacion-aidlc/00_METADATOS_PROYECTO.md)
- 🗺️ [Plan de la carta digital](./documentacion-aidlc/diseno/PLAN_CARTA_DIGITAL.md)
- 🎯 [Requisitos e Intención](./documentacion-aidlc/requisitos/)
- 📖 [Historias de Usuario y Criterios](./documentacion-aidlc/historias/)
- 🏛️ [Arquitectura y Decisiones Técnicas (ADR)](./documentacion-aidlc/diseno/ARQUITECTURA.md)
- 🧪 [Estrategia de Pruebas](./documentacion-aidlc/pruebas/ESTRATEGIA_PRUEBAS.md)
- 🚀 [Despliegue e Infraestructura (Vercel)](./documentacion-aidlc/despliegue/INFRAESTRUCTURA_COMO_CODIGO.md)
- 🤖 [Instrucciones para Agentes (AGENTS.md)](./INSTRUCCIONES_AGENTE.md)
- 📐 [Estándar del Repositorio](./ESTANDAR_PROYECTO.md)
- 📜 [Manifiesto del Proyecto](./MANIFIESTO_PROYECTO.md)
- 🤝 [Guía de Contribución](./CONTRIBUIR.md)
- 🗺️ [Hoja de Ruta (Roadmap)](./HOJA_RUTA.md)

*Última actualización AI-DLC:* 2026-10-23
