# Instrucciones para Agentes de Desarrollo (AGENTS.md)

## Definición del documento

- **Para qué sirve:** establece reglas estrictas, límites, permisos y protocolos de validación obligatorios para cualquier agente de IA que interactúe con el repositorio.
- **Cuándo se crea o actualiza:** al iniciar el proyecto y cada vez que se refinen las políticas de trabajo autónomo o estándares de seguridad.
- **Qué debe contener:** lectura obligatoria previa, límites técnicos, prohibición de secretos y borrados destructivos, validaciones antes de confirmar y política de ramas.

---

## 1. Lectura Obligatoria

Antes de proponer o ejecutar cualquier cambio de código, el agente de IA **DEBE leer y comprender**:
1. [`MANIFIESTO_PROYECTO.md`](./MANIFIESTO_PROYECTO.md)
2. [`ESTANDAR_PROYECTO.md`](./ESTANDAR_PROYECTO.md)
3. [`documentacion-aidlc/00_METADATOS_PROYECTO.md`](./documentacion-aidlc/00_METADATOS_PROYECTO.md)
4. [`documentacion-aidlc/diseno/ARQUITECTURA.md`](./documentacion-aidlc/diseno/ARQUITECTURA.md)

---

## 2. Límites y Prohibiciones Estrictas

1. **Cero Secretos:** NUNCA escribas, copies, confirmes ni expongas claves de API, tokens, contraseñas ni cadenas de conexión en archivos del repositorio.
2. **Prohibición de Borrado Destructivo:** NUNCA ejecutes comandos destructivos como `rm -rf`, `git reset --hard`, `git push --force` o borrado de carpetas esenciales sin instrucción explícita del usuario.
3. **No Modificar Arquitectura sin ADR:** NO cambies el framework, gestor de paquetes o arquitectura general sin registrar previamente una decisión en `documentacion-aidlc/diseno/DECISIONES/` marcada como `⚠️ Pendiente de validación humana`.
4. **Conservación de Documentación:** NUNCA sobrescribas contenido real existente con plantillas genéricas. Audita y complementa de forma idempotente.
5. **No Inventar Datos:** Distingue rigurosamente entre información **extraída**, **inferida** y **pendiente de validación humana**.

---

## 3. Protocolo de Validación Técnica

Antes de finalizar una tarea de código o documentación, el agente debe:
- Verificar tipos con `npx astro check` (o equivalente si aplica).
- Asegurar que la compilación funciona ejecutando `npm run build`.
- Registrar cualquier código o documentación generada en [`documentacion-aidlc/generacion-codigo/REGISTRO_CODIGO_GENERADO.md`](./documentacion-aidlc/generacion-codigo/REGISTRO_CODIGO_GENERADO.md) y [`documentacion-aidlc/REGISTRO_PROMPTS.md`](./documentacion-aidlc/REGISTRO_PROMPTS.md).
