# Partes Interesadas (Stakeholders)

## Definición del documento

- **Para qué sirve:** identifica los roles, usuarios y actores involucrados en el proyecto y su nivel de impacto.
- **Cuándo se crea o actualiza:** en la fase de Iniciación y cuando se sumen nuevos colaboradores o tipos de usuarios.
- **Qué debe contener:** lista de actores, roles, responsabilidades, necesidades principales y expectativas.

---

## 1. Mapa de Partes Interesadas

| Rol / Actor | Nombre / Identificador | Tipo | Necesidad principal | Influencia |
|---|---|---|---|---|
| **Responsable del proyecto / desarrollador** | `jhonabruzzi278` | Interno | Entregar una carta digital rápida, mantenible y segura | Alto |
| **Dueño del local (administrador)** | Dueño de «Dónde Si No» ⚠️ nombre por confirmar | Cliente | Cambiar precios, fotos, promos y disponibilidad desde el celular, sin ayuda técnica | Alto |
| **Comensal en el local** | Quien escanea el QR en la mesa | Externo | Ver la carta rápido, con fotos y precios, sin instalar nada | Alto |
| **Cliente que busca dónde comer** | Llega desde Google, Maps, Instagram o Uber Eats | Externo | Saber qué venden, cuánto cuesta, si está abierto y cómo llegar | Alto |
| **Turista / cliente extranjero** | Visitante de paso por la Ruta G60 | Externo | Entender la carta en inglés | Medio |
| **Agente de IA** | Claude Code (metodología AI-DLC) | Interno (técnico) | Estándares claros, trazabilidad y decisiones registradas | Medio |
| **Proveedores de infraestructura** | Vercel (hosting, Blob), Turso (base de datos) | Externo | Uso dentro de los planes contratados | Bajo |

---

## 2. Matriz de Participación

- **Aprobación de alcance y decisiones:** `jhonabruzzi278`.
- **Contenido de la carta** (precios, fotos, horario, promociones): dueño del local, a través del panel.
- **Ejecución técnica:** agente de IA + desarrollador.
- **⚠️ Pendiente de validación humana:** cuántas personas del local editarán la carta. El MVP considera una sola cuenta de administrador.
