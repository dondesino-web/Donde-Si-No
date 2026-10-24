# INICIO DE PROYECTO AI-DLC
## Instrucción maestra para agentes de desarrollo

> **Instrucciones para el agente:** Lee este documento completo. Después ejecuta la misión final de forma autónoma, sin pedir confirmación paso a paso. Analiza, decide, genera y presenta los resultados al terminar. Si existe una ambigüedad que no bloquee el trabajo, formula el supuesto y continúa.

## Misión

Al recibir este archivo en la raíz de un proyecto, debes:

1. Analizar a fondo el código, carpetas, historial Git, README, manifiestos, dependencias, pruebas, CI/CD y configuración de despliegue.
2. Detectar la fase AI-DLC: Iniciación, Construcción, Operaciones o Mixta.
3. Auditar la documentación existente y determinar qué falta según este estándar.
4. Crear o completar la carpeta `/documentacion-aidlc/` con los documentos que correspondan a la fase detectada y a las fases anteriores.
5. Crear o actualizar los documentos operativos y de colaboración del repositorio según la sección de estándares.
6. Crear o actualizar `README.md` para reflejar el estado real y enlazar la documentación.
7. Presentar un resumen ejecutivo final con hallazgos, cambios, supuestos, pendientes y próximos pasos.

No inventes datos. Distingue siempre entre información **extraída**, **inferida** y **pendiente de validación humana**.

## Metodología AI-DLC

AI-DLC (AI-Driven Development Lifecycle) no es Scrum con IA añadida: la IA propone y las personas revisan y aprueban. Los ciclos se miden en horas o días, no necesariamente en semanas.

### Fases

- **Iniciación (Inception):** convierte ideas e intenciones en unidades de trabajo bien definidas: requisitos, historias y arquitectura.
- **Construcción (Construction):** convierte las unidades en código probado: diseño de dominio, diseño lógico, implementación y pruebas.
- **Operaciones (Operations):** cubre despliegue, monitoreo, confiabilidad y mejora continua.

### Conceptos y equivalencias

| Concepto AI-DLC | Significado | Equivalencia habitual |
|---|---|---|
| Intent | Objetivo de negocio de alto nivel | Intención / objetivo |
| Unit | Bloque de trabajo independiente y desplegable | Unidad de trabajo |
| Bolt | Iteración rápida de horas o días | Iteración |
| Domain Design | Modelo del negocio independiente de la infraestructura | Diseño de dominio / DDD |
| Logical Design | Traducción técnica del dominio, NFR y decisiones | Diseño lógico / arquitectura |
| Deployment Unit | Código, configuración e infraestructura probados como entrega | Unidad desplegable |

## Paso 1: detección de fase

Analiza las preguntas en orden. La primera condición aplicable determina la fase principal:

```text
¿Existe código funcional en el repositorio, más allá de un scaffolding vacío?
├─ NO → INICIACIÓN (o pre-iniciación si tampoco existe una idea o README claro)
└─ SÍ → continuar

¿Existen pruebas unitarias o de integración y se ejecutan localmente o en CI?
├─ NO → CONSTRUCCIÓN TEMPRANA
└─ SÍ → continuar

¿Existe evidencia de despliegue (Docker, CI/CD, infraestructura como código o scripts),
pero no de producción activa (monitoreo, registros productivos o alertas)?
├─ SÍ → CONSTRUCCIÓN TARDÍA
└─ NO → continuar

¿Existe evidencia de producción (monitoreo, registros, alertas, SLA, manuales de operación)
o el usuario lo confirma?
├─ SÍ → OPERACIONES
└─ NO → MIXTA; documentar cada parte por separado
```

### Señales que debes buscar

| Evidencia | Indica |
|---|---|
| Carpeta vacía o solo README | Pre-iniciación |
| Requisitos o historias sin código | Iniciación |
| Código y manifiesto de dependencias, sin pruebas | Construcción temprana |
| Pruebas, cobertura o pipeline CI | Construcción media |
| Dockerfile, Compose, Terraform, Kubernetes o scripts de despliegue | Construcción tardía |
| Monitoreo, alertas, registros estructurados, health checks o SLA | Operaciones |
| `/documentacion-aidlc/` existente | Auditar y complementar, no empezar desde cero |

## Paso 2: auditoría por fase

Marca cada elemento como presente, parcial o pendiente. Si la información está dispersa en el código, comentarios, issues, Notion, commits o README, extráela y formalízala: cuenta como existente. Solo marca como pendiente lo que no exista en ninguna forma.

### Iniciación

- [ ] Intención u objetivo de negocio
- [ ] Responsables y partes interesadas
- [ ] Historias de usuario o requisitos
- [ ] Decisiones de arquitectura y stack
- [ ] Riesgos, restricciones y supuestos

### Construcción

- [ ] Todo lo de Iniciación, aunque sea reconstruido retroactivamente
- [ ] Modelo de dominio identificable
- [ ] Decisiones arquitectónicas y patrones usados
- [ ] Pruebas y cobertura medible
- [ ] Pipeline CI/CD
- [ ] Proceso visible de revisión de código y ramas

### Operaciones

- [ ] Todo lo de Construcción
- [ ] Infraestructura como código
- [ ] Despliegue automatizado
- [ ] Monitoreo y alertas
- [ ] Registros centralizados
- [ ] SLA o expectativas de disponibilidad y latencia
- [ ] Manuales de operación y respuesta ante incidentes

## Paso 3: estructura documental

Usa esta estructura en la raíz del proyecto. `README.md` se conserva por ser un estándar técnico universal. Los documentos propios usan nombres en español.

```text
documentacion-aidlc/
├── 00_METADATOS_PROYECTO.md
├── requisitos/
│   ├── INTENCION.md
│   ├── REQUISITOS.md
│   └── PARTES_INTERESADAS.md
├── historias/
│   ├── HISTORIAS_USUARIO.md
│   └── CRITERIOS_ACEPTACION.md
├── diseno/
│   ├── MODELO_DOMINIO.md
│   ├── DISENO_LOGICO.md
│   ├── ARQUITECTURA.md
│   └── DECISIONES/
│       └── DEC-001-[nombre-decision].md
├── generacion-codigo/
│   ├── REGISTRO_CODIGO_GENERADO.md
│   └── NOTAS_REVISION_CODIGO.md
├── pruebas/
│   ├── ESTRATEGIA_PRUEBAS.md
│   └── INFORME_COBERTURA.md
├── despliegue/
│   ├── LISTA_VERIFICACION_DESPLIEGUE.md
│   └── INFRAESTRUCTURA_COMO_CODIGO.md
├── operaciones/
│   ├── CONFIGURACION_MONITOREO.md
│   ├── DEFINICION_SLA.md
│   ├── MANUALES_INCIDENTES.md
│   └── ANALISIS_POST_INCIDENTE/
└── REGISTRO_PROMPTS.md
```

### Equivalencias técnicas conservadas

Si un proveedor, herramienta o integración exige un nombre fijo, consérvalo y documenta su equivalencia. Ejemplos: `README.md` (documentación principal), `package.json` (manifiesto de Node.js), `Dockerfile`, `.github/workflows/`, `CHANGELOG.md` (equivalente recomendado: `REGISTRO_CAMBIOS.md`) y `AGENTS.md` (equivalente recomendado: `INSTRUCCIONES_AGENTE.md`). No renombres archivos cuya herramienta dependa literalmente de su nombre.

### Reglas de generación

- Genera solo los documentos correspondientes a la fase detectada y las fases anteriores.
- Para fases futuras, crea únicamente un documento índice o marca `Pendiente — el proyecto aún no llega a esta fase` cuando sea útil para la navegación.
- Si la carpeta ya existe, conserva todo contenido real. Audita, complementa y corrige solo lo necesario; no sobrescribas ni dupliques secciones válidas.
- No rellenes plantillas con texto genérico presentado como hecho. Usa fuentes concretas del repositorio.
- Cada documento nuevo debe comenzar con una sección `## Definición del documento` que incluya exactamente:

```markdown
## Definición del documento

- **Para qué sirve:** [propósito concreto]
- **Cuándo se crea o actualiza:** [momento o evento]
- **Qué debe contener:** [contenido mínimo esperado]
```

## Paso 4: estándares complementarios del repositorio

Además de `/documentacion-aidlc/`, crea o actualiza estos documentos cuando correspondan. Usa español en el nombre; conserva el nombre universal entre paréntesis si una plataforma lo espera.

```text
INSTRUCCIONES_AGENTE.md       (AGENTS.md, si la herramienta lo exige)
CONTRIBUIR.md                 (CONTRIBUTING.md, si la plataforma lo exige)
REGISTRO_CAMBIOS.md           (CHANGELOG.md, si una herramienta lo exige)
HOJA_RUTA.md                  (ROADMAP.md)
SEGURIDAD.md                  (SECURITY.md, si el proveedor lo exige)
ESTANDAR_PROYECTO.md          (PROJECT_STANDARD.md)
MANIFIESTO_PROYECTO.md        (project manifest; nombre propio en español)
```

Cada uno debe incluir la sección estandarizada de definición y, como mínimo:

- `INSTRUCCIONES_AGENTE.md`: lectura obligatoria antes de modificar; validaciones; límites; prohibición de secretos, borrados, cambios de arquitectura sin decisión documentada y commits directos a la rama principal.
- `CONTRIBUIR.md`: requisitos previos, instalación, ramas, formato de commits, pruebas, revisión, pull requests y criterios de aceptación.
- `REGISTRO_CAMBIOS.md`: cambios por versión o fecha, categorías y enlaces a decisiones; no inventar versiones ni cambios históricos.
- `HOJA_RUTA.md`: objetivos por horizonte, estado, prioridad, dependencias, riesgos y pendientes; separar compromisos de ideas.
- `SEGURIDAD.md`: reporte responsable, alcance, secretos, dependencias, datos sensibles, respuesta a incidentes y contacto disponible; no inventar un contacto.
- `ESTANDAR_PROYECTO.md`: estructura de carpetas, convenciones, documentación, ramas, commits, PR, pruebas, despliegue, releases, seguridad y reglas de agentes.
- `MANIFIESTO_PROYECTO.md`: nombre, propósito, estado, propietario, stack, comandos, dependencias externas, variables de entorno, despliegue, enlaces documentales y fecha de actualización.

## Plantillas documentales

Todas las plantillas siguientes deben empezar por `## Definición del documento` con los tres campos indicados. Sustituye los corchetes con información real y añade la etiqueta `⚠️ Pendiente de validación humana` cuando no sea posible determinar un dato.

### `00_METADATOS_PROYECTO.md`

```markdown
# Metadatos del proyecto

## Definición del documento
- **Para qué sirve:** resume identidad, fase y estado documental del proyecto.
- **Cuándo se crea o actualiza:** durante cada auditoría AI-DLC o cambio importante.
- **Qué debe contener:** nombre, responsable, fechas, fase, completitud, enlaces y supuestos.

**Nombre:** [detectado]
**Responsable:** [Git, README u otra fuente]
**Analizado el:** [fecha actual]
**Fase actual:** [fase]
**Última actualización:** [fecha actual]

## Estado
- [ ] Iniciación — [completa/parcial/pendiente]
- [ ] Construcción — [completa/parcial/pendiente]
- [ ] Operaciones — [completa/parcial/pendiente]

## Enlaces rápidos
- Requisitos: `documentacion-aidlc/requisitos/`
- Arquitectura: `documentacion-aidlc/diseno/ARQUITECTURA.md`
- Despliegue: `documentacion-aidlc/despliegue/`

## Notas y supuestos
[Distinguir extracción, inferencia y pendiente.]
```

### `requisitos/INTENCION.md`

Debe documentar propósito, objetivos de negocio, métricas de éxito, restricciones técnicas y de negocio. Extrae la información del README, código y commits; si no existe, escribe `⚠️ No documentado — requiere validación del responsable del producto`.

### `requisitos/REQUISITOS.md` y `PARTES_INTERESADAS.md`

Incluyen requisitos funcionales y no funcionales, prioridad, fuente, estado, supuestos, responsables, usuarios afectados, necesidades y nivel de participación. No atribuyas responsabilidades sin evidencia.

### `historias/HISTORIAS_USUARIO.md` y `CRITERIOS_ACEPTACION.md`

Mapean capacidades reales a historias trazables. Cada historia debe tener identificador, rol, necesidad, beneficio, prioridad, fuente y estado. Los criterios deben ser verificables y estar vinculados a la historia correspondiente.

### `diseno/MODELO_DOMINIO.md`

Documenta el contexto delimitado y entidades, agregados, objetos de valor, repositorios y eventos identificados en el código. Indica la ruta o fuente de cada hallazgo y marca como inferido aquello que no esté explícito.

### `diseno/DISENO_LOGICO.md`

Documenta patrones reales, capas, NFR, stack con versiones y fuente, servicios externos, flujos de datos, autenticación, persistencia y decisiones técnicas.

### `diseno/ARQUITECTURA.md`

Incluye árbol resumido de carpetas, responsabilidades, diagrama o flujo textual, stack, decisiones detectadas, dependencias, límites del sistema y enlaces a decisiones registradas.

### `diseno/DECISIONES/DEC-001-[nombre-decision].md`

Cada decisión debe contener contexto, problema, opciones consideradas, decisión, consecuencias, estado, fecha y responsable. Usa numeración incremental y nombres en español.

### `generacion-codigo/REGISTRO_CODIGO_GENERADO.md` y `NOTAS_REVISION_CODIGO.md`

Registran qué se generó o modificó con asistencia de IA, por qué, archivos afectados, validaciones realizadas, riesgos y revisión humana. Nunca sustituyen la revisión del código.

### `pruebas/ESTRATEGIA_PRUEBAS.md` y `INFORME_COBERTURA.md`

Identifican frameworks, comandos, tipos de prueba, alcance, riesgos y brechas. Ejecuta la cobertura si es posible y registra el resultado real con fecha; si no, escribe el comando sugerido y `No se pudo medir`.

### `despliegue/LISTA_VERIFICACION_DESPLIEGUE.md`

Incluye pruebas, CI/CD, secretos, migraciones, configuración, reversión, infraestructura detectada y resultado real de cada verificación. No expongas valores secretos.

### `despliegue/INFRAESTRUCTURA_COMO_CODIGO.md`

Describe proveedores y archivos de infraestructura realmente encontrados, entornos, recursos, variables, permisos, estado y riesgos. Si no existe infraestructura como código, decláralo.

### `operaciones/CONFIGURACION_MONITOREO.md`, `DEFINICION_SLA.md`, `MANUALES_INCIDENTES.md` y `ANALISIS_POST_INCIDENTE/`

Documentan monitoreo, alertas, registros, objetivos de disponibilidad, tiempos de respuesta, procedimientos de incidentes y análisis posteriores. Solo genera contenido operativo cuando haya evidencia o cuando la fase lo requiera; marca lo que falte.

### `REGISTRO_PROMPTS.md`

```markdown
# Registro de prompts

## Definición del documento
- **Para qué sirve:** conserva la trazabilidad de instrucciones de IA usadas en el proyecto.
- **Cuándo se crea o actualiza:** después de cada análisis o generación relevante asistida por IA.
- **Qué debe contener:** fecha, propósito, resumen, fase, artefactos afectados y validación humana.
```

## Paso 5: README.md

Después de generar `/documentacion-aidlc/`, actualiza o crea `README.md`:

- Si ya tiene contenido real, no lo reescribas completo. Añade o actualiza una sección al final.
- Si está vacío o es genérico, crea una versión útil con nombre, descripción inferida, stack, instalación, comandos disponibles y documentación.
- Conserva el idioma y estilo útil del README existente, pero usa nombres documentales en español.

```markdown
## Documentación del proyecto (AI-DLC)

Este proyecto sigue la metodología AI-DLC. Estado actual: **[FASE]**.

Documentación completa: [`/documentacion-aidlc/`](./documentacion-aidlc/)

- [Requisitos](./documentacion-aidlc/requisitos/)
- [Arquitectura](./documentacion-aidlc/diseno/ARQUITECTURA.md)
- [Estrategia de pruebas](./documentacion-aidlc/pruebas/ESTRATEGIA_PRUEBAS.md)
- [Despliegue](./documentacion-aidlc/despliegue/)
- [Estándar del proyecto](./ESTANDAR_PROYECTO.md)

Última auditoría: [fecha]
```

## Paso 6: resumen ejecutivo final

Presenta directamente en el chat:

```text
ANÁLISIS COMPLETO: [nombre]

FASE DETECTADA: [fase] ([porcentaje estimado, si puede justificarse])

LO QUE ENCONTRÉ:
- [3 a 5 hallazgos reales]

LO QUE GENERÉ O ACTUALICÉ:
- [documentos y carpetas]
- README.md: [creado/actualizado/sin cambios]

SUPUESTOS:
- [inferencias que requieren confirmación]

⚠️ PENDIENTE DE VALIDACIÓN HUMANA:
- [pendientes y placeholders]

HOJA DE RUTA RECOMENDADA:
1. [prioridad más urgente]
2. [siguiente acción]
3. [siguiente acción]
```

## Reglas innegociables

1. Nunca inventes métricas de negocio, cobertura, disponibilidad, responsables o resultados.
2. Nunca sobrescribas código fuente. Solo modifica documentación y `README.md`, salvo que el usuario indique otra cosa.
3. Nunca borres documentación con contenido real; audita y complementa.
4. Marca explícitamente información extraída, inferida y pendiente.
5. No pidas confirmación en cada micro-paso; trabaja de forma autónoma.
6. No expongas secretos ni copies valores sensibles a la documentación.
7. No cambies arquitectura sin registrar una decisión y señalar que requiere aprobación humana.
8. Haz el proceso idempotente: comprueba si un archivo existe, conserva lo válido, actualiza solo lo desactualizado y evita duplicados.
9. Registra los cambios documentales realizados y las validaciones ejecutadas.
10. Si un nombre universal es obligatorio para una herramienta, consérvalo y documenta su equivalencia en español.

## Principios VIN Studio

- **Transparencia total:** documenta el estado real sin inflar la completitud.
- **Documentación como activo:** trata la documentación como parte del producto.
- **Sin dependencia innecesaria de proveedor:** no asumas AWS, GCP o Azure salvo evidencia.
- **Calidad sobre velocidad:** si no puede determinarse con confianza, márcalo pendiente.
- **Trazabilidad:** cada afirmación importante debe tener una fuente o estar etiquetada como inferencia.

---

**AHORA EJECUTA LA MISIÓN. Analiza el proyecto completo, genera o actualiza la documentación y presenta el resumen ejecutivo final.**
